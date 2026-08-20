// lib/services/checkout.ts
// Checkout flow: validate → allocate → record → create order (§5.3, §5.5, §6, §11)
import { eq } from 'drizzle-orm';
import { db, sql as pgSql } from '@/lib/db';
import {
  orders, orderItems, orderEvents, invoices,
  products, productBatches, addresses,
} from '@/lib/db/schema';
import { getCartView, clearCart } from './cart';
import { getProductStockSummary, allocateFEFO, recordStockMovement } from './stock';
import { calculateOrderTotals, type PricingItem } from './pricing';
import { getDeliveryQuote } from './delivery';
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
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  orderNo?: string;
  total?: number;
  error?: string;
  insufficientItems?: Array<{ productId: string; nameEn: string; requested: number; available: number }>;
}

/**
 * Generate an order number: ORD-YYMM-NNNN (Western digits always §15.3 rule 4).
 */
function generateOrderNo(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `ORD-${yy}${mm}-${seq}`;
}

/**
 * Generate an invoice number: INV-YYMM-NNNN (§11).
 */
function generateInvoiceNo(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(1000 + Math.random() * 9000));
  return `INV-${yy}${mm}-${seq}`;
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

  // Check for Rx products without prescription
  const rxItems = cart.items.filter((i) => i.product.requiresPrescription);
  if (rxItems.length > 0 && !input.prescriptionId) {
    return {
      success: false,
      error: 'Cart contains prescription-only products. Please upload a prescription first.',
    };
  }

  // 2. Get address and delivery quote
  const [address] = await db
    .select()
    .from(addresses)
    .where(eq(addresses.id, input.addressId))
    .limit(1);

  if (!address) {
    return { success: false, error: 'Delivery address not found.' };
  }

  const deliveryQuote = await getDeliveryQuote(address.division, address.district);
  let shippingFeePaisa = deliveryQuote?.rate ?? 13000; // Default ৳130 outside Dhaka

  // Free shipping from coupon
  if (input.couponResult?.valid && input.couponResult.coupon?.type === 'free_shipping') {
    shippingFeePaisa = 0;
  }

  // Cold chain surcharge check
  const hasColdChain = cart.items.some((i) => i.product.requiresColdChain);
  if (hasColdChain && deliveryQuote && !deliveryQuote.coldChainEnabled) {
    return {
      success: false,
      error: `Cold-chain delivery is not available for ${address.district}. Please select a different address.`,
    };
  }

  // 3. FEFO Batch Allocation for each cart item
  const allocationMap = new Map<string, Awaited<ReturnType<typeof allocateFEFO>>>();
  const insufficientItems: CheckoutResult['insufficientItems'] = [];

  for (const item of cart.items) {
    const stockSummary = await getProductStockSummary(item.productId);
    const batchesForAlloc = stockSummary.batches.map((b) => ({
      batchId: b.batchId,
      batchNo: b.batchNo,
      expiryDate: new Date(b.expiryDate),
      availableStock: Number(b.currentStock),
    }));

    const allocation = allocateFEFO(batchesForAlloc, item.qty);
    allocationMap.set(item.productId, allocation);

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
  const orderNo = generateOrderNo();
  const invoiceNo = generateInvoiceNo();
  const paymentMethod = input.paymentMethod ?? 'cod';

  // Determine initial status (§5.5)
  const initialStatus = rxItems.length > 0 ? 'awaiting_rx_review' : 'placed';

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

  const orderId = await db.transaction(async (tx) => {
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
      })
      .returning();

    // 5b. Insert order items with full snapshots (§6)
    for (const item of cart.items) {
      const allocation = allocationMap.get(item.productId)!;

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

    return order.id;
  });

  // 9. Clear cart (can be done outside the transaction)
  await clearCart(input.cartId);

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

    // §5.5: a guest cannot attach a prescription, so Rx items cannot be bought
    // through this flow. Easier to relax later than to retrofit.
    if (product.requiresPrescription) {
      return {
        success: false,
        errorCode: 'PRESCRIPTION_REQUIRED',
        error: `"${product.nameEn}" is prescription-only and cannot be ordered without an approved prescription.`,
      };
    }

    resolved.push({ product, qty: line.qty });
  }

  // 2. Delivery quote and cold-chain serviceability (§5.4).
  const deliveryQuote = await getDeliveryQuote(input.division, input.district);
  const shippingFeePaisa = deliveryQuote?.rate ?? 13000; // 130 taka default outside Dhaka

  const hasColdChain = resolved.some((r) => r.product.requiresColdChain);
  if (hasColdChain && deliveryQuote && !deliveryQuote.coldChainEnabled) {
    return {
      success: false,
      errorCode: 'COLD_CHAIN_UNAVAILABLE',
      error: `Cold-chain delivery is not available for ${input.district}.`,
    };
  }

  // 3. FEFO allocation (§5.3) — checked at confirm time, never at cart time.
  const allocationMap = new Map<string, ReturnType<typeof allocateFEFO>>();
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

    allocationMap.set(product.id, allocation);

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

  const orderNo = generateOrderNo();
  const invoiceNo = generateInvoiceNo();
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

      for (const { product } of resolved) {
        const allocation = allocationMap.get(product.id)!;

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
