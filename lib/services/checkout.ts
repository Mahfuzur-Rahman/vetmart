// lib/services/checkout.ts
// Checkout flow: validate → allocate → record → create order (§5.3, §5.5, §6, §11)
import { and, eq } from 'drizzle-orm';
import { db, sql as pgSql } from '@/lib/db';
import {
  orders, orderItems, orderEvents, invoices,
  products, addresses, carts, cartItems,
} from '@/lib/db/schema';
import { getCartView } from './cart';
import {
  getProductStockSummary,
  allocateFEFO,
  lockAndAllocateFEFO,
  recordStockMovement,
} from './stock';
import { calculateOrderTotals, type PricingItem } from './pricing';
import { getDeliveryQuote } from './delivery';
import { getShippingSettings } from './settings';
import { normalizePhone } from '@/lib/i18n/number';
import type { CouponValidationResult } from './coupons';

export interface CheckoutInput {
  cartId: string;
  userId: string;
  addressId: string;
  paymentMethod?: 'cod' | 'sslcommerz' | 'bkash_direct';
  couponResult?: CouponValidationResult;
  prescriptionId?: string;
  note?: string;
  /** §9: replayed rather than duplicated when the same key arrives twice. */
  idempotencyKey?: string;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  orderNo?: string;
  total?: number;
  /** True when this idempotency key was already used and the original is returned. */
  replayed?: boolean;
  error?: string;
  insufficientItems?: Array<{ productId: string; nameEn: string; requested: number; available: number }>;
}

/** Dhaka-local YYMM for a document number. §6: stored UTC, rendered Dhaka. */
function dhakaYearMonth(): string {
  // Asia/Dhaka is UTC+6 with no DST, so a fixed offset is exact here.
  const dhaka = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const yy = String(dhaka.getUTCFullYear()).slice(-2);
  const mm = String(dhaka.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

/**
 * Draw the next value from a Postgres sequence (migration 0004).
 *
 * These numbers used to be a random four-digit suffix — 9000 possible values a
 * month written into UNIQUE columns, so past roughly 120 orders in a month a
 * collision was more likely than not, and it surfaced as a failed checkout
 * rather than a retry. §11 calls for a sequence: never reused, never gapped.
 *
 * Deliberately taken outside any transaction: `nextval` does not roll back, so
 * a failed order leaves its number unused instead of blocking the next one.
 */
async function nextSequenceValue(name: 'order_no_seq' | 'invoice_no_seq'): Promise<number> {
  const rows =
    name === 'order_no_seq'
      ? await pgSql<{ value: string }[]>`SELECT nextval('order_no_seq')::bigint AS value`
      : await pgSql<{ value: string }[]>`SELECT nextval('invoice_no_seq')::bigint AS value`;

  const value = Number(rows[0]?.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Sequence ${name} returned no value. Has migration 0004 been applied?`);
  }
  return value;
}

/** ORD-YYMM-NNNN, Western digits always (§15.3 rule 4). */
async function generateOrderNo(): Promise<string> {
  const seq = await nextSequenceValue('order_no_seq');
  return `ORD-${dhakaYearMonth()}-${String(seq).padStart(4, '0')}`;
}

/** INV-YYMM-NNNN (§11). */
async function generateInvoiceNo(): Promise<string> {
  const seq = await nextSequenceValue('invoice_no_seq');
  return `INV-${dhakaYearMonth()}-${String(seq).padStart(4, '0')}`;
}

/**
 * Execute the full checkout pipeline:
 *
 * 1. Validate cart items are active and in stock.
 * 2. Look up delivery zone rate from the customer's address.
 * 3. Allocate batches via FEFO.
 * 4. Calculate financial totals (subtotal, VAT, discount, shipping, total) in integer paisa.
 * 5. Insert order + order_items (with product/batch/expiry snapshots).
 * 6. Record stock_ledger movements for each allocation.
 * 7. Insert order_event for 'placed' status.
 * 8. Generate invoice record.
 * 9. Clear the cart.
 */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  // Replay an earlier submit of the same key instead of creating a second order.
  // Only the guest express flow had this; the authenticated checkout duplicated
  // the order (and later the courier consignment) on any retry, which on BD
  // mobile data is routine rather than rare (§9).
  if (input.idempotencyKey) {
    const alreadyPlaced = await findOrderByIdempotencyKey(input.idempotencyKey);
    if (alreadyPlaced) {
      return {
        success: true,
        replayed: true,
        orderId: alreadyPlaced.id,
        orderNo: alreadyPlaced.orderNo,
        total: alreadyPlaced.total,
      };
    }
  }

  // 1. Load cart
  const cart = await getCartView(input.cartId);
  if (cart.items.length === 0) {
    return { success: false, error: 'Cart is empty.' };
  }

  // Check for inactive products
  const inactiveItems = cart.items.filter((i) => !i.product.isActive);
  if (inactiveItems.length > 0) {
    return {
      success: false,
      error: `Some products are no longer available: ${inactiveItems.map((i) => i.product.nameEn).join(', ')}`,
    };
  }



  // 2. Get address and delivery quote.
  //
  // Scoped to the buyer. Looking the address up by id alone let any logged-in
  // customer pass someone else's addressId: the order shipped to that address
  // and its full snapshot (recipient name, phone, street) came back on their own
  // order — an address-book read primitive for anyone with a UUID.
  const [address] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, input.addressId), eq(addresses.userId, input.userId)))
    .limit(1);

  if (!address) {
    return { success: false, error: 'Delivery address not found.' };
  }

  const shippingSettings = await getShippingSettings();
  let shippingFeePaisa = 0;
  const deliveryQuote = await getDeliveryQuote(address.division, address.district);

  if (shippingSettings.deliveryChargeEnabled) {
    shippingFeePaisa = deliveryQuote?.rate ?? shippingSettings.outsideRate;
    // Free shipping if ALL products in the cart have hasShippingCharge === false
    const allFreeShipping = cart.items.every((i) => i.product.hasShippingCharge === false);
    if (allFreeShipping) {
      shippingFeePaisa = 0;
    }
  }

  // Free shipping from coupon
  if (input.couponResult?.valid && input.couponResult.coupon?.type === 'free_shipping') {
    shippingFeePaisa = 0;
  }

  // Cold chain serviceability (§5.4). Fails CLOSED: the old condition required
  // `deliveryQuote` to exist, so a district with no delivery_zones row skipped
  // the check entirely and vaccines shipped to an unserviced area.
  const hasColdChain = cart.items.some((i) => i.product.requiresColdChain);
  if (hasColdChain && !deliveryQuote?.coldChainEnabled) {
    return {
      success: false,
      error: `Cold-chain delivery is not available for ${address.district}. Please select a different address.`,
    };
  }

  // 3. Unlocked FEFO pre-check, so an obviously out-of-stock basket gets a fast,
  //    itemised answer. It is NOT the decision: the binding allocation happens
  //    under `SELECT … FOR UPDATE` inside the order transaction below (§20 —
  //    "negative stock: impossible by construction").
  const insufficientItems: CheckoutResult['insufficientItems'] = [];

  for (const item of cart.items) {
    const stockSummary = await getProductStockSummary(item.productId);
    const allocation = allocateFEFO(
      stockSummary.batches.map((b) => ({
        batchId: b.batchId,
        batchNo: b.batchNo,
        expiryDate: new Date(b.expiryDate),
        availableStock: Number(b.currentStock),
      })),
      item.qty
    );

    if (allocation.unfulfilledQty > 0) {
      insufficientItems!.push({
        productId: item.productId,
        nameEn: item.product.nameEn,
        requested: item.qty,
        available: item.qty - allocation.unfulfilledQty,
      });
    }
  }

  if (insufficientItems!.length > 0) {
    return {
      success: false,
      error: 'Some products do not have sufficient sellable stock.',
      insufficientItems,
    };
  }

  // 4. Calculate financial totals
  const pricingItems: PricingItem[] = cart.items.map((item) => ({
    qty: item.qty,
    unitPrice: item.product.salePrice,
    vatRatePercent: parseFloat(item.product.vatRate) || 0,
  }));

  const discountPaisa = input.couponResult?.valid ? (input.couponResult.discountPaisa ?? 0) : 0;

  const totals = calculateOrderTotals({
    items: pricingItems,
    shippingFeePaisa,
    discountPaisa,
  });

  // 5–9. Execute in an ACTUAL database transaction
  const orderNo = await generateOrderNo();
  const invoiceNo = await generateInvoiceNo();
  const paymentMethod = input.paymentMethod ?? 'cod';

  // Initial order status
  const initialStatus = 'placed';

  // Address snapshot (§6)
  const addressSnapshot = {
    recipientName: address.recipientName,
    phone: address.phone,
    division: address.division,
    district: address.district,
    upazila: address.upazila,
    area: address.area,
    addressLine: address.addressLine,
  };

  /** Thrown to roll the order back when the locked allocation comes up short. */
  class InsufficientStockError extends Error {
    constructor(readonly items: NonNullable<CheckoutResult['insufficientItems']>) {
      super('Insufficient sellable stock');
    }
  }

  let orderId: string;
  try {
    orderId = await db.transaction(async (tx) => {
      // 5. Insert order
      const [order] = await tx
        .insert(orders)
        .values({
          orderNo,
          userId: input.userId,
          status: initialStatus,
          subtotal: totals.subtotal,
          discount: totals.discount,
          vat: totals.vat,
          shipping: totals.shipping,
          total: totals.total,
          paymentMethod,
          paymentStatus: 'pending',
          addressSnapshot,
          rxId: input.prescriptionId || null,
          // §12 rule 5: a cold-chain order must never be handed to Steadfast
          // standard. The guest flow set this; the authenticated one did not, so
          // vaccines were routed to the standard courier.
          fulfilmentChannel: hasColdChain ? 'cold_chain' : 'steadfast',
          idempotencyKey: input.idempotencyKey ?? null,
        })
        .returning();

      // 5b. Insert order items with full snapshots (§6)
      for (const item of cart.items) {
        // Binding allocation: locks the batch rows, then re-derives stock from the
        // ledger inside this transaction.
        const allocation = await lockAndAllocateFEFO(tx, item.productId, item.qty);

        if (allocation.unfulfilledQty > 0) {
          // Someone else took the stock between the pre-check and here. Abort the
          // whole order rather than shipping a short line.
          throw new InsufficientStockError([
            {
              productId: item.productId,
              nameEn: item.product.nameEn,
              requested: item.qty,
              available: item.qty - allocation.unfulfilledQty,
            },
          ]);
        }

        for (const alloc of allocation.allocations) {
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: item.productId,
            batchId: alloc.batchId,
            nameSnapshotEn: item.product.nameEn,
            nameSnapshotBn: item.product.nameBn,
            genericSnapshot: item.product.genericName,
            batchNo: alloc.batchNo,
            expiryDate: alloc.expiryDate,
            qty: alloc.qtyAllocated,
            unitPrice: item.product.salePrice,
            vatRate: item.product.vatRate,
            lineTotal: alloc.qtyAllocated * item.product.salePrice,
            // §11: the invoice must print the withdrawal period for any
            // food-animal drug. These were snapshotted on guest orders only, so an
            // account holder's invoice silently showed 0 days.
            withdrawalMeatDays: item.product.withdrawalMeatDays ?? 0,
            withdrawalMilkHours: item.product.withdrawalMilkHours ?? 0,
          });

          // 6. Record stock_ledger movements (§2 rule 3)
          await recordStockMovement({
            productId: item.productId,
            batchId: alloc.batchId,
            delta: -alloc.qtyAllocated, // Negative = outgoing
            reason: 'sale',
            refType: 'order',
            refId: order.id,
          }, tx);
        }
      }

      // 7. Insert initial order event
      await tx.insert(orderEvents).values({
        orderId: order.id,
        fromStatus: null,
        toStatus: initialStatus,
        actor: 'customer',
        note: input.note || null,
      });

      // 8. Generate invoice record (§11)
      await tx.insert(invoices).values({
        orderId: order.id,
        invoiceNo,
      });

      // 9. Empty the cart in the same transaction. Done afterwards, a failure here
      // left the order placed and the basket still full — one tap from a
      // duplicate order.
      await tx.delete(cartItems).where(eq(cartItems.cartId, input.cartId));
      await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, input.cartId));

      return order.id;
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return {
        success: false,
        error: 'Some products do not have sufficient sellable stock.',
        insufficientItems: err.items,
      };
    }

    // Two concurrent submits of the same idempotency key: one wins the unique
    // index, the other returns the winner's order instead of an error.
    if ((err as { code?: string })?.code === '23505' && input.idempotencyKey) {
      const replayed = await findOrderByIdempotencyKey(input.idempotencyKey);
      if (replayed) {
        return {
          success: true,
          replayed: true,
          orderId: replayed.id,
          orderNo: replayed.orderNo,
          total: replayed.total,
        };
      }
    }

    throw err;
  }

  return {
    success: true,
    orderId,
    orderNo,
    total: totals.total,
  };
}

// ---------------------------------------------------------------------------
// Guest express orders (§9, §13 — COD is the default and the majority path)
// ---------------------------------------------------------------------------

export interface GuestOrderLineInput {
  /** Either a product UUID or a catalog slug. */
  productId?: string;
  slug?: string;
  qty: number;
}

export interface GuestOrderInput {
  items: GuestOrderLineInput[];
  recipientName: string;
  phone: string; // any BD format; normalized to 8801XXXXXXXXX before storing (§20)
  division: string;
  district: string;
  upazila?: string;
  area?: string;
  addressLine: string;
  paymentMethod?: 'cod' | 'sslcommerz' | 'bkash_direct';
  note?: string;
  sourceChannel?: string;
  utmSource?: string;
  utmCampaign?: string;
  /** §9: required by the route so a dropped connection cannot duplicate an order. */
  idempotencyKey: string;
}

export interface GuestOrderResult {
  success: boolean;
  orderId?: string;
  orderNo?: string;
  total?: number;
  /** True when this key was already used and the original order is returned. */
  replayed?: boolean;
  errorCode?: string;
  error?: string;
  insufficientItems?: CheckoutResult['insufficientItems'];
}

/** Thrown inside a guest order transaction to roll it back on a stock race. */
class GuestInsufficientStockError extends Error {
  constructor(readonly items: NonNullable<CheckoutResult['insufficientItems']>) {
    super('Insufficient sellable stock');
  }
}

/** Look up a previously placed order by its Idempotency-Key (§9). */
async function findOrderByIdempotencyKey(key: string) {
  const [row] = await db
    .select({ id: orders.id, orderNo: orders.orderNo, total: orders.total })
    .from(orders)
    .where(eq(orders.idempotencyKey, key))
    .limit(1);
  return row ?? null;
}

/**
 * Place an order for a customer who has no account, no DB cart and no saved
 * address — the social/express COD flow, which is the majority path in BD.
 *
 * Shares the pipeline placeOrder uses: FEFO allocation (§5.3), the stock ledger
 * (§2 rule 3), full line snapshots (§6), an order event and an invoice row. The
 * only differences are that line items arrive inline rather than from a cart,
 * and userId stays null.
 *
 * Previously this flow wrote the order to localStorage and never contacted the
 * server, so an order placed on a phone was invisible to the admin on every
 * other device and never decremented stock.
 */
export async function placeGuestOrder(input: GuestOrderInput): Promise<GuestOrderResult> {
  if (input.items.length === 0) {
    return { success: false, errorCode: 'EMPTY_ORDER', error: 'Order contains no items.' };
  }

  // Replay an earlier submit of the same key rather than creating a duplicate.
  const alreadyPlaced = await findOrderByIdempotencyKey(input.idempotencyKey);
  if (alreadyPlaced) {
    return {
      success: true,
      replayed: true,
      orderId: alreadyPlaced.id,
      orderNo: alreadyPlaced.orderNo,
      total: alreadyPlaced.total,
    };
  }

  // 1. Resolve every line against the live catalog. Prices come from the
  //    database, never from the client payload — a client-supplied price is a
  //    free discount for anyone with dev tools open.
  const resolved: Array<{ product: typeof products.$inferSelect; qty: number }> = [];

  for (const line of input.items) {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      return {
        success: false,
        errorCode: 'INVALID_QTY',
        error: 'Quantity must be a positive whole number.',
      };
    }

    const where = line.productId
      ? eq(products.id, line.productId)
      : eq(products.slug, line.slug ?? '');

    const [product] = await db.select().from(products).where(where).limit(1);

    if (!product || !product.isActive) {
      return {
        success: false,
        errorCode: 'PRODUCT_UNAVAILABLE',
        error: `Product "${line.slug ?? line.productId}" is not available.`,
      };
    }



    resolved.push({ product, qty: line.qty });
  }

  // 2. Delivery quote and cold-chain serviceability (§5.4).
  const shippingSettings = await getShippingSettings();
  const deliveryQuote = await getDeliveryQuote(input.division, input.district);
  let shippingFeePaisa = 0;

  if (shippingSettings.deliveryChargeEnabled) {
    // Free shipping if ALL products have hasShippingCharge === false
    const allFreeShipping = resolved.every((r) => r.product.hasShippingCharge === false);
    shippingFeePaisa = allFreeShipping ? 0 : (deliveryQuote?.rate ?? shippingSettings.outsideRate);
  }

  // Fails CLOSED (§5.4): requiring `deliveryQuote` to exist meant a district
  // with no delivery_zones row bypassed the check completely.
  const hasColdChain = resolved.some((r) => r.product.requiresColdChain);
  if (hasColdChain && !deliveryQuote?.coldChainEnabled) {
    return {
      success: false,
      errorCode: 'COLD_CHAIN_UNAVAILABLE',
      error: `Cold-chain delivery is not available for ${input.district}.`,
    };
  }

  // 3. Unlocked FEFO pre-check (§5.3 — checked at confirm time, never at cart
  //    time). The binding allocation runs under row locks inside the
  //    transaction below.
  const insufficientItems: CheckoutResult['insufficientItems'] = [];

  for (const { product, qty } of resolved) {
    const stockSummary = await getProductStockSummary(product.id);
    const allocation = allocateFEFO(
      stockSummary.batches.map((b) => ({
        batchId: b.batchId,
        batchNo: b.batchNo,
        expiryDate: new Date(b.expiryDate),
        availableStock: Number(b.currentStock),
      })),
      qty
    );

    if (allocation.unfulfilledQty > 0) {
      insufficientItems!.push({
        productId: product.id,
        nameEn: product.nameEn,
        requested: qty,
        available: qty - allocation.unfulfilledQty,
      });
    }
  }

  if (insufficientItems!.length > 0) {
    return {
      success: false,
      errorCode: 'OUT_OF_STOCK',
      error: 'Some products do not have sufficient sellable stock.',
      insufficientItems,
    };
  }

  // 4. Totals, integer paisa throughout (§2 rule 5).
  const totals = calculateOrderTotals({
    items: resolved.map(({ product, qty }) => ({
      qty,
      unitPrice: product.salePrice,
      vatRatePercent: parseFloat(product.vatRate) || 0,
    })),
    shippingFeePaisa,
    discountPaisa: 0,
  });

  const orderNo = await generateOrderNo();
  const invoiceNo = await generateInvoiceNo();
  const canonicalPhone = normalizePhone(input.phone);

  const addressSnapshot = {
    recipientName: input.recipientName,
    phone: canonicalPhone,
    division: input.division,
    district: input.district,
    upazila: input.upazila ?? null,
    area: input.area ?? null,
    addressLine: input.addressLine,
  };

  try {
    const orderId = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderNo,
          userId: null,
          status: 'placed',
          subtotal: totals.subtotal,
          discount: totals.discount,
          vat: totals.vat,
          shipping: totals.shipping,
          total: totals.total,
          paymentMethod: input.paymentMethod ?? 'cod',
          paymentStatus: 'pending',
          addressSnapshot,
          guestName: input.recipientName,
          guestPhone: canonicalPhone,
          sourceChannel: input.sourceChannel ?? null,
          utmSource: input.utmSource ?? null,
          utmCampaign: input.utmCampaign ?? null,
          idempotencyKey: input.idempotencyKey,
          // Cold-chain orders never go to Steadfast standard (§12 rule 5).
          fulfilmentChannel: hasColdChain ? 'cold_chain' : 'steadfast',
        })
        .returning();

      for (const { product, qty } of resolved) {
        // Binding allocation under SELECT … FOR UPDATE, inside this transaction.
        const allocation = await lockAndAllocateFEFO(tx, product.id, qty);

        if (allocation.unfulfilledQty > 0) {
          throw new GuestInsufficientStockError([
            {
              productId: product.id,
              nameEn: product.nameEn,
              requested: qty,
              available: qty - allocation.unfulfilledQty,
            },
          ]);
        }

        for (const alloc of allocation.allocations) {
          // Snapshot everything: the order must be reconstructible years later
          // even if the product row changes or is deactivated (§6).
          await tx.insert(orderItems).values({
            orderId: order.id,
            productId: product.id,
            batchId: alloc.batchId,
            nameSnapshotEn: product.nameEn,
            nameSnapshotBn: product.nameBn,
            genericSnapshot: product.genericName,
            batchNo: alloc.batchNo,
            expiryDate: alloc.expiryDate,
            qty: alloc.qtyAllocated,
            unitPrice: product.salePrice,
            vatRate: product.vatRate,
            lineTotal: alloc.qtyAllocated * product.salePrice,
            withdrawalMeatDays: product.withdrawalMeatDays ?? 0,
            withdrawalMilkHours: product.withdrawalMilkHours ?? 0,
          });

          await recordStockMovement(
            {
              productId: product.id,
              batchId: alloc.batchId,
              delta: -alloc.qtyAllocated, // negative = outgoing
              reason: 'sale',
              refType: 'order',
              refId: order.id,
            },
            tx
          );
        }
      }

      await tx.insert(orderEvents).values({
        orderId: order.id,
        fromStatus: null,
        toStatus: 'placed',
        actor: 'customer',
        note: input.note || null,
      });

      await tx.insert(invoices).values({ orderId: order.id, invoiceNo });

      return order.id;
    });

    return { success: true, orderId, orderNo, total: totals.total };
  } catch (err: any) {
    if (err instanceof GuestInsufficientStockError) {
      return {
        success: false,
        errorCode: 'OUT_OF_STOCK',
        error: 'Some products do not have sufficient sellable stock.',
        insufficientItems: err.items,
      };
    }

    // Two concurrent submits of the same key: one wins the unique index, the
    // other reads the winner's row rather than reporting a failure.
    if (err?.code === '23505') {
      const replayed = await findOrderByIdempotencyKey(input.idempotencyKey);
      if (replayed) {
        return {
          success: true,
          replayed: true,
          orderId: replayed.id,
          orderNo: replayed.orderNo,
          total: replayed.total,
        };
      }
    }
    throw err;
  }
}
