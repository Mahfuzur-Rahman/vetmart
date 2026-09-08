// lib/services/fulfillment.ts
// Order fulfillment: status transitions, shipping, Rx approval, webhook processing (§5.5, §12, §14.1)
import { and, eq, sql as dSql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  orders,
  orderItems,
  orderEvents,
  shipments,
  prescriptions,
  invoices,
  stockLedger,
} from '@/lib/db/schema';
import { getCourierDriver, type CreateShipmentInput } from '@/lib/courier';
import { getPdfDriver } from '@/lib/pdf';
import { getStorageDriver } from '@/lib/storage';
import { buildInvoiceData, renderInvoiceHtml } from './invoice';
import { logAdminAction } from './audit';

type OrderStatus = 'placed' | 'awaiting_rx_review' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

// Valid status transitions (§5.5)
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['confirmed', 'processing', 'cancelled'],
  awaiting_rx_review: ['processing', 'cancelled', 'confirmed'],
  confirmed: ['processing', 'shipped', 'cancelled', 'placed'],
  processing: ['shipped', 'delivered', 'cancelled', 'confirmed'],
  shipped: ['delivered', 'returned', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

export interface TransitionResult {
  success: boolean;
  error?: string;
}

/** Statuses that release the stock an order was holding. */
const STOCK_RELEASING_STATUSES: ReadonlySet<OrderStatus> = new Set(['cancelled', 'returned']);

/** `stock_ledger.ref_type` used for the reversal, so it can be recognised again. */
const RESTOCK_REF_TYPE = 'order_release';

/**
 * Put an order's allocated stock back on the shelf.
 *
 * Cancelling or returning an order previously left the `sale` ledger rows
 * standing with nothing to offset them, so every cancellation permanently
 * destroyed that stock on paper — the batch looked sold out and the shop stopped
 * offering goods it still had. §2 rule 3 means the correction is a new positive
 * row, never an edit or a delete of the original.
 *
 * Idempotent: a second call finds the existing reversal rows and does nothing,
 * which matters because the courier can deliver the same `returned` webhook
 * twice.
 */
async function releaseOrderStock(
  tx: any,
  orderId: string,
  reason: 'return' | 'adjust'
): Promise<void> {
  const [already] = await tx
    .select({ count: dSql<number>`count(*)::int` })
    .from(stockLedger)
    .where(and(eq(stockLedger.refType, RESTOCK_REF_TYPE), eq(stockLedger.refId, orderId)));

  if ((already?.count ?? 0) > 0) return;

  const lines = await tx
    .select({
      productId: orderItems.productId,
      batchId: orderItems.batchId,
      qty: orderItems.qty,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const line of lines as Array<{ productId: string; batchId: string; qty: number }>) {
    if (line.qty <= 0) continue;
    await tx.insert(stockLedger).values({
      productId: line.productId,
      batchId: line.batchId,
      delta: line.qty, // positive = back into the batch
      reason,
      refType: RESTOCK_REF_TYPE,
      refId: orderId,
    });
  }
}

export interface TransitionOptions {
  /** Who is making the change; recorded on the order event. */
  actor?: 'admin' | 'system' | 'customer' | 'steadfast_webhook';
  /** Present for an operator-driven change, so the audit log has an author. */
  adminId?: string;
  note?: string;
}

/**
 * Transition an order to a new status with audit trail (§5.5).
 *
 * Everything below runs in one transaction: the status, the order event and any
 * stock reversal have to land together or not at all.
 */
export async function transitionOrderStatus(
  orderId: string,
  toStatus: OrderStatus,
  adminIdOrOptions?: string | TransitionOptions,
  note?: string
): Promise<TransitionResult> {
  const options: TransitionOptions =
    typeof adminIdOrOptions === 'string'
      ? { actor: 'admin', adminId: adminIdOrOptions, note }
      : { actor: 'admin', ...(adminIdOrOptions ?? {}), note: adminIdOrOptions?.note ?? note };

  const result = await db.transaction(async (tx) => {
    // Lock the order row so two concurrent transitions cannot both pass the
    // validity check and both release stock.
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1)
      .for('update');

    if (!order) {
      return { success: false as const, error: 'Order not found.' };
    }

    const currentStatus = order.status as OrderStatus;

    // Idempotent: transitioning to current status is a no-op success
    if (currentStatus === toStatus) {
      return { success: true as const, from: currentStatus };
    }

    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(toStatus)) {
      return {
        success: false as const,
        error: `Cannot transition from "${order.status}" to "${toStatus}". Allowed: ${allowed?.join(', ') || 'none'}.`,
      };
    }

    // Stamp the lifecycle timestamps the schema declares. They were never
    // written, so every reporting query keyed on confirmed_at / cancelled_at
    // saw NULL (§6, §14.2 Reports).
    const patch: Record<string, unknown> = { status: toStatus };
    if (toStatus === 'confirmed' && !order.confirmedAt) patch.confirmedAt = new Date();
    if (toStatus === 'cancelled' && !order.cancelledAt) patch.cancelledAt = new Date();

    await tx.update(orders).set(patch).where(eq(orders.id, orderId));

    if (STOCK_RELEASING_STATUSES.has(toStatus)) {
      await releaseOrderStock(tx, orderId, toStatus === 'returned' ? 'return' : 'adjust');
    }

    // Record immutable order event
    await tx.insert(orderEvents).values({
      orderId,
      fromStatus: order.status,
      toStatus,
      actor: options.actor ?? 'admin',
      note: options.note || null,
    });

    return { success: true as const, from: currentStatus };
  });

  if (!result.success) return result;

  // Audit outside the transaction: a logging failure must not roll back a
  // completed state change (logAdminAction already swallows its own errors).
  if (options.adminId && result.from !== toStatus) {
    await logAdminAction({
      adminId: options.adminId,
      action: 'status_change',
      entity: 'order',
      entityId: orderId,
      after: { from: result.from, to: toStatus, note: options.note },
    });
  }

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

  // Check if shipment already exists
  const [existingShipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.orderId, orderId))
    .limit(1);

  if (existingShipment) {
    return {
      success: true,
      consignmentId: existingShipment.consignmentId,
      trackingCode: existingShipment.trackingCode,
    };
  }

  if (order.status === 'placed' || order.status === 'confirmed') {
    const advance = await transitionOrderStatus(orderId, 'processing', adminId, 'Auto-advanced for dispatch');
    if (!advance.success) {
      return { success: false, error: advance.error };
    }
    order.status = 'processing';
  }

  if (order.status !== 'processing') {
    return { success: false, error: 'Order must be in "processing" status to create shipment.' };
  }

  // §12 rule 5: cold-chain orders never go to Steadfast standard, and the rule
  // belongs here rather than in the UI. Without this check the driver was called
  // unconditionally and vaccines were handed to the standard courier.
  if (order.fulfilmentChannel && order.fulfilmentChannel !== 'steadfast') {
    return {
      success: false,
      error:
        `This order is routed to "${order.fulfilmentChannel}" fulfilment and cannot be handed to the ` +
        'standard courier. Assign it to own-rider or a cold-chain partner instead.',
    };
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
    // §12 rule 4: neutral description plus the invoice number — never the drug
    // names, which invites tampering in transit.
    itemDescription: `Animal health supplies — ${order.orderNo}`,
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
  // Find the shipment by consignment ID or tracking code
  let [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.consignmentId, input.consignmentId))
    .limit(1);

  if (!shipment && input.trackingCode) {
    const [byTracking] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.trackingCode, input.trackingCode))
      .limit(1);
    shipment = byTracking;
  }

  if (!shipment) {
    return { success: false, error: `Shipment not found for consignment "${input.consignmentId}"` };
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
    // Route through transitionOrderStatus rather than updating `orders`
    // directly. The inline update here skipped the stock reversal and the
    // cancelled_at stamp, so a courier-reported return lost the goods on paper.
    // An invalid transition is not an error for the caller — the courier is
    // simply reporting a state we have already moved past.
    const transition = await transitionOrderStatus(shipment.orderId, targetOrderStatus, {
      actor: 'steadfast_webhook',
      note: `Auto-transitioned via Steadfast webhook (consignment: ${input.consignmentId})`,
    });

    if (!transition.success) {
      console.warn(
        `[SteadfastWebhook] Order ${shipment.orderId} not transitioned to "${targetOrderStatus}": ${transition.error}`
      );
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

