// lib/services/fulfillment.ts
// Order fulfillment: status transitions, shipping, Rx approval, webhook processing (§5.5, §12, §14.1)
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderEvents, shipments, prescriptions, invoices } from '@/lib/db/schema';
import { getCourierDriver, type CreateShipmentInput } from '@/lib/courier';
import { getPdfDriver } from '@/lib/pdf';
import { getStorageDriver } from '@/lib/storage';
import { buildInvoiceData, renderInvoiceHtml } from './invoice';
import { logAdminAction } from './audit';

type OrderStatus = 'placed' | 'awaiting_rx_review' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

// Valid status transitions (§5.5)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['processing', 'cancelled', 'confirmed'],
  awaiting_rx_review: ['processing', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: [],
  cancelled: [],
  returned: [],
};

export interface TransitionResult {
  success: boolean;
  error?: string;
}

/**
 * Transition an order to a new status with audit trail (§5.5).
 */
export async function transitionOrderStatus(
  orderId: string,
  toStatus: OrderStatus,
  adminId: string,
  note?: string
): Promise<TransitionResult> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  const currentStatus = order.status as OrderStatus;
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    return {
      success: false,
      error: `Cannot transition from "${order.status}" to "${toStatus}". Allowed: ${allowed?.join(', ') || 'none'}.`,
    };
  }

  // Update order status
  await db
    .update(orders)
    .set({ status: toStatus })
    .where(eq(orders.id, orderId));

  // Record immutable order event
  await db.insert(orderEvents).values({
    orderId,
    fromStatus: order.status,
    toStatus,
    actor: 'admin',
    note: note || null,
  });

  // Audit log
  await logAdminAction({
    adminId,
    action: 'status_change',
    entity: 'order',
    entityId: orderId,
    after: { from: order.status, to: toStatus, note },
  });

  return { success: true };
}

/**
 * Create a shipping consignment via the courier driver (§12).
 */
export async function createShipmentForOrder(
  orderId: string,
  adminId: string
): Promise<{ success: boolean; consignmentId?: string; trackingCode?: string; error?: string }> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  if (order.status !== 'processing') {
    return { success: false, error: 'Order must be in "processing" status to create shipment.' };
  }

  const addr = order.addressSnapshot as any;
  const codAmount = order.paymentMethod === 'cod' ? order.total : 0;

  const courier = getCourierDriver();
  const input: CreateShipmentInput = {
    invoice: order.orderNo,
    recipientName: addr?.recipientName || '',
    recipientPhone: addr?.phone || '',
    recipientAddress: [addr?.addressLine, addr?.area, addr?.upazila, addr?.district, addr?.division]
      .filter(Boolean)
      .join(', '),
    codAmount,
    note: `VetMart Order ${order.orderNo}`,
    itemDescription: 'Veterinary Medicine',
  };

  try {
    const result = await courier.createShipment(input);

    // Record shipment in DB
    await db.insert(shipments).values({
      orderId,
      courier: 'steadfast',
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
      status: result.status,
      codAmount,
    });

    // Auto-transition to shipped
    await transitionOrderStatus(orderId, 'shipped', adminId, `Consignment: ${result.consignmentId}`);

    return {
      success: true,
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Courier API call failed.' };
  }
}

/**
 * Generate and store the invoice PDF for an order (§11).
 */
export async function generateInvoicePdf(
  orderId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  const invoiceData = await buildInvoiceData(orderId);
  if (!invoiceData) {
    return { success: false, error: 'Invoice data not found for this order.' };
  }

  const html = renderInvoiceHtml(invoiceData);

  try {
    const pdfDriver = getPdfDriver();
    const pdfBuffer = await pdfDriver.renderHtmlToPdf(html);

    const storage = getStorageDriver();
    const path = `invoices/${invoiceData.invoiceNo}.pdf`;
    await storage.put(path, pdfBuffer, { contentType: 'application/pdf' });

    // Update invoice record with PDF path
    await db
      .update(invoices)
      .set({ pdfPath: path })
      .where(eq(invoices.orderId, orderId));

    return { success: true, path };
  } catch (err: any) {
    return { success: false, error: err?.message || 'PDF generation failed.' };
  }
}

/**
 * Approve a prescription and advance the order (§5.5).
 */
export async function approvePrescription(
  prescriptionId: string,
  adminId: string,
  note?: string
): Promise<TransitionResult> {
  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId))
    .limit(1);

  if (!rx) return { success: false, error: 'Prescription not found.' };

  // Update prescription status
  await db
    .update(prescriptions)
    .set({
      status: 'approved',
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
    })
    .where(eq(prescriptions.id, prescriptionId));

  // Find and advance the associated order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.rxId, prescriptionId))
    .limit(1);

  if (order && order.status === 'awaiting_rx_review') {
    await transitionOrderStatus(order.id, 'processing', adminId, `Rx approved: ${prescriptionId}`);
  }

  await logAdminAction({
    adminId,
    action: 'approve',
    entity: 'prescription',
    entityId: prescriptionId,
    after: { note },
  });

  return { success: true };
}

/**
 * Reject a prescription and cancel the associated order (§5.5).
 */
export async function rejectPrescription(
  prescriptionId: string,
  adminId: string,
  reason: string
): Promise<TransitionResult> {
  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(eq(prescriptions.id, prescriptionId))
    .limit(1);

  if (!rx) return { success: false, error: 'Prescription not found.' };

  await db
    .update(prescriptions)
    .set({
      status: 'rejected',
      reviewedByAdminId: adminId,
      reviewedAt: new Date(),
      rejectReason: reason,
    })
    .where(eq(prescriptions.id, prescriptionId));

  // Cancel the associated order
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.rxId, prescriptionId))
    .limit(1);

  if (order && order.status === 'awaiting_rx_review') {
    await transitionOrderStatus(order.id, 'cancelled', adminId, `Rx rejected: ${reason}`);
  }

  await logAdminAction({
    adminId,
    action: 'reject',
    entity: 'prescription',
    entityId: prescriptionId,
    after: { reason },
  });

  return { success: true };
}

// ─── Steadfast Webhook Processing (§12) ─────────────────────────────────

/**
 * Map Steadfast delivery statuses to VetMart order statuses.
 * Steadfast statuses: in_review, pending, cancelled, unknown_pickup,
 *   pickup_assigned, picked_up, received_at_warehouse, in_transit,
 *   delivered_to_hub, out_for_delivery, delivered, partial_delivered,
 *   cancelled_delivery, hold, return, returned, returned_to_warehouse
 */
const STEADFAST_TO_ORDER_STATUS: Record<string, OrderStatus | null> = {
  // These mean the shipment is in progress — order stays 'shipped'
  in_review: null,
  pending: null,
  pickup_assigned: null,
  picked_up: null,
  received_at_warehouse: null,
  in_transit: null,
  delivered_to_hub: null,
  out_for_delivery: null,
  unknown_pickup: null,
  hold: null,
  partial_delivered: null,

  // Terminal statuses — transition the order
  delivered: 'delivered',
  cancelled: 'cancelled',
  cancelled_delivery: 'cancelled',
  return: 'returned',
  returned: 'returned',
  returned_to_warehouse: 'returned',
};

export interface SteadfastWebhookInput {
  consignmentId: string;
  trackingCode?: string;
  status: string;
  raw: unknown;
}

/**
 * Process an incoming Steadfast webhook payload.
 * Updates the shipment record and transitions the order if needed.
 */
export async function processSteadfastWebhook(
  input: SteadfastWebhookInput
): Promise<TransitionResult> {
  // Find the shipment by consignment ID
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.consignmentId, input.consignmentId))
    .limit(1);

  if (!shipment) {
    return { success: false, error: `Shipment not found for consignment ${input.consignmentId}` };
  }

  // Update shipment record with latest status and raw payload
  await db
    .update(shipments)
    .set({
      status: input.status,
      lastSyncedAt: new Date(),
      raw: input.raw as any,
    })
    .where(eq(shipments.id, shipment.id));

  // Record a tracking event in order_events regardless of whether we transition
  await db.insert(orderEvents).values({
    orderId: shipment.orderId,
    fromStatus: shipment.status,
    toStatus: input.status,
    actor: 'steadfast_webhook',
    note: `Steadfast status: ${input.status}` + (input.trackingCode ? ` (tracking: ${input.trackingCode})` : ''),
  });

  // Check if this Steadfast status maps to an order status transition
  const targetOrderStatus = STEADFAST_TO_ORDER_STATUS[input.status];

  if (targetOrderStatus) {
    // Fetch current order to validate transition
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, shipment.orderId))
      .limit(1);

    if (order) {
      const currentStatus = order.status as OrderStatus;
      const allowed = VALID_TRANSITIONS[currentStatus];

      if (allowed?.includes(targetOrderStatus)) {
        // Perform the transition
        await db
          .update(orders)
          .set({ status: targetOrderStatus })
          .where(eq(orders.id, shipment.orderId));

        // Record the official order transition event
        await db.insert(orderEvents).values({
          orderId: shipment.orderId,
          fromStatus: currentStatus,
          toStatus: targetOrderStatus,
          actor: 'steadfast_webhook',
          note: `Auto-transitioned via Steadfast webhook (consignment: ${input.consignmentId})`,
        });
      }
    }
  }

  return { success: true };
}

// ─── Order Tracking Timeline (§12) ──────────────────────────────────────

export interface TrackingEvent {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  note: string | null;
  at: Date;
}

export interface OrderTrackingInfo {
  orderId: string;
  orderNo: string;
  currentStatus: string;
  trackingCode: string | null;
  courier: string | null;
  consignmentId: string | null;
  events: TrackingEvent[];
}

/**
 * Get the full tracking timeline for an order (customer-facing).
 */
export async function getOrderTracking(
  orderId: string,
  userId?: string
): Promise<OrderTrackingInfo | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return null;

  // If userId is provided, verify the order belongs to the user
  if (userId && order.userId !== userId) return null;

  // Get shipment info
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, orderId))
    .limit(1);

  // Get all events in chronological order
  const events = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(orderEvents.at);

  return {
    orderId: order.id,
    orderNo: order.orderNo,
    currentStatus: order.status,
    trackingCode: shipment?.trackingCode ?? null,
    courier: shipment?.courier ?? null,
    consignmentId: shipment?.consignmentId ?? null,
    events: events.map((e) => ({
      id: e.id,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actor: e.actor,
      note: e.note,
      at: e.at,
    })),
  };
}

