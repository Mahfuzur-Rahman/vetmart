// lib/services/courier-booking.ts
// Bulk and Single Courier Dispatching Service (§12, §14)
import { getCourierDriver, type CreateShipmentInput } from '@/lib/courier';

export interface DispatchableOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  recipientAddress: string;
  district: string;
  division: string;
  totalAmount: number; // in integer paisa
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  items?: Array<{ productNameEn: string; quantity: number }>;
}

export interface DispatchResultItem {
  orderId: string;
  orderNumber: string;
  consignmentId: string;
  trackingCode: string;
  status: string;
  dispatchedAt: string;
}

export interface DispatchFailedItem {
  orderId: string;
  orderNumber: string;
  reason: string;
}

export interface BulkDispatchReport {
  successCount: number;
  failureCount: number;
  dispatched: DispatchResultItem[];
  failed: DispatchFailedItem[];
}

/**
 * Dispatches a single order to the active courier driver (Steadfast or mock)
 */
export async function dispatchSingleOrder(order: DispatchableOrder): Promise<DispatchResultItem> {
  const driver = getCourierDriver();

  // If order is prepaid, COD is 0; otherwise COD is full order total in paisa
  const isPrepaid = order.paymentStatus === 'paid' && order.paymentMethod !== 'cod';
  const codAmount = isPrepaid ? 0 : order.totalAmount;

  const fullAddress = `${order.recipientAddress}, ${order.district}, ${order.division}`;
  const itemSummary = order.items
    ? order.items.map((i) => `${i.quantity}x ${i.productNameEn}`).join(', ')
    : `Order ${order.orderNumber}`;

  const shipmentInput: CreateShipmentInput = {
    invoice: order.orderNumber,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientAddress: fullAddress,
    codAmount,
    note: order.notes || 'Handle with care - Veterinary Health Supplies',
    itemDescription: `VetMart Supplies - ${itemSummary}`.slice(0, 250),
  };

  const result = await driver.createShipment(shipmentInput);
  const nowIso = new Date().toISOString();

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    consignmentId: result.consignmentId,
    trackingCode: result.trackingCode,
    status: 'dispatched',
    dispatchedAt: nowIso,
  };
}

/**
 * Dispatches multiple orders in batch with rate-limiting and error resilience
 */
export async function bulkDispatchOrders(orders: DispatchableOrder[]): Promise<BulkDispatchReport> {
  const dispatched: DispatchResultItem[] = [];
  const failed: DispatchFailedItem[] = [];

  for (const order of orders) {
    try {
      const res = await dispatchSingleOrder(order);
      dispatched.push(res);
      // Subtle delay to prevent hitting courier rate limits (e.g. 50ms)
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown dispatch error';
      failed.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        reason: errorMessage,
      });
    }
  }

  return {
    successCount: dispatched.length,
    failureCount: failed.length,
    dispatched,
    failed,
  };
}
