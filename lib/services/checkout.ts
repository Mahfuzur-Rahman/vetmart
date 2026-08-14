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
