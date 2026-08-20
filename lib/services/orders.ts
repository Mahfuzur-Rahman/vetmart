// lib/services/orders.ts
// Order read models for the admin board and customer history (§2 rule 1, §6)
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderItems, products } from '@/lib/db/schema';
import { DB_TO_BOARD_STATUS, type AdminOrderStatus } from './order-status';

export { BOARD_TO_DB_STATUS, DB_TO_BOARD_STATUS } from './order-status';
export type { AdminOrderStatus } from './order-status';

export interface AdminOrderItemView {
  productId: string;
  productSlug: string;
  productNameEn: string;
  productNameBn: string;
  unitPrice: number; // integer paisa
  quantity: number;
  totalPrice: number; // integer paisa
  batchNo: string;
  expiryDate: string;
}

export interface AdminOrderView {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerType: 'vet' | 'retail' | 'farm';
  recipientAddress: string;
  district: string;
  division: string;
  status: AdminOrderStatus;
  items: AdminOrderItemView[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  requiresRx: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * List orders for the admin board, newest first.
 *
 * Orders used to live only in the browser's localStorage under
 * 'vetmart_mock_orders', so an order placed on a phone was invisible to the
 * admin on any other device. They are database rows now; this is the read side.
 */
export async function listOrdersForAdmin(limit = 100): Promise<AdminOrderView[]> {
  const orderRows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.placedAt))
    .limit(limit);

  if (orderRows.length === 0) return [];

  // One batched query for all line items rather than one per order.
  const itemRows = await db
    .select({
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productSlug: products.slug,
      nameSnapshotEn: orderItems.nameSnapshotEn,
      nameSnapshotBn: orderItems.nameSnapshotBn,
      batchNo: orderItems.batchNo,
      expiryDate: orderItems.expiryDate,
      qty: orderItems.qty,
      unitPrice: orderItems.unitPrice,
      lineTotal: orderItems.lineTotal,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(inArray(orderItems.orderId, orderRows.map((o) => o.id)));

  const itemsByOrder = new Map<string, AdminOrderItemView[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({
      productId: row.productId,
      productSlug: row.productSlug ?? '',
      productNameEn: row.nameSnapshotEn,
      productNameBn: row.nameSnapshotBn,
      unitPrice: row.unitPrice,
      quantity: row.qty,
      totalPrice: row.lineTotal,
      batchNo: row.batchNo,
      expiryDate: row.expiryDate.toISOString(),
    });
    itemsByOrder.set(row.orderId, list);
  }

  return orderRows.map((o) => {
    const snapshot = (o.addressSnapshot ?? {}) as Record<string, string | null>;

    return {
      id: o.id,
      orderNumber: o.orderNo,
      // Guest orders carry contact details inline; account orders fall back to
      // the address snapshot, which is authoritative for this order (§6).
      customerName: o.guestName ?? snapshot.recipientName ?? 'Customer',
      customerPhone: o.guestPhone ?? snapshot.phone ?? '',
      customerType: 'retail',
      recipientAddress: [snapshot.addressLine, snapshot.area, snapshot.upazila]
        .filter(Boolean)
        .join(', '),
      district: snapshot.district ?? '',
      division: snapshot.division ?? '',
      status: DB_TO_BOARD_STATUS[o.status] ?? 'pending',
      items: itemsByOrder.get(o.id) ?? [],
      subtotal: o.subtotal,
      deliveryFee: o.shipping,
      totalAmount: o.total,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      requiresRx: !!o.rxId || o.status === 'awaiting_rx_review',
      createdAt: o.placedAt.toISOString(),
      updatedAt: (o.confirmedAt ?? o.placedAt).toISOString(),
    };
  });
}
