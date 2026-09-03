// app/api/v1/admin/reconciliation/route.ts
// Live Courier COD & Settlement Reconciliation API (§12, §14)
import { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, shipments } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/api/guard';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export interface CourierSettlementRecord {
  id: string;
  orderNumber: string;
  consignmentId: string;
  courierName: string;
  customerName: string;
  customerPhone: string;
  bookedCodPaisa: number;
  collectedCodPaisa: number;
  deliveryFeePaisa: number;
  productCogsPaisa: number;
  netDisbursementExpectedPaisa: number;
  settlementStatus: 'settled_in_bank' | 'pending_courier' | 'discrepancy';
  disbursementDate?: string;
  bankTrxId?: string;
  notes?: string;
}

export async function GET(_req: NextRequest) {
  const guard = await requireAdmin('order.read');
  if (!guard.ok) return guard.response;

  try {
    const rows = await db
      .select({
        shipmentId: shipments.id,
        orderId: shipments.orderId,
        courier: shipments.courier,
        consignmentId: shipments.consignmentId,
        trackingCode: shipments.trackingCode,
        shipmentStatus: shipments.status,
        codAmount: shipments.codAmount,
        createdAt: shipments.createdAt,
        raw: shipments.raw,
        orderNo: orders.orderNo,
        orderStatus: orders.status,
        shipping: orders.shipping,
        subtotal: orders.subtotal,
        total: orders.total,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        guestName: orders.guestName,
        guestPhone: orders.guestPhone,
        addressSnapshot: orders.addressSnapshot,
      })
      .from(shipments)
      .innerJoin(orders, eq(shipments.orderId, orders.id))
      .orderBy(desc(shipments.createdAt))
      .limit(200);

    const records: CourierSettlementRecord[] = rows.map((r) => {
      const snapshot = (r.addressSnapshot ?? {}) as Record<string, string | null>;
      const isDelivered = r.orderStatus === 'delivered' || r.shipmentStatus === 'delivered';
      const isReturned = r.orderStatus === 'returned' || r.shipmentStatus === 'returned';
      const isPaid = r.paymentStatus === 'paid';

      // Delivered orders collect full booked COD; returns collect 0 COD
      const collectedCodPaisa = isDelivered ? r.codAmount : 0;
      const deliveryFeePaisa = r.shipping || 7000; // Default ৳70 if 0
      // Estimated COGS (~60% of subtotal)
      const productCogsPaisa = Math.round(r.subtotal * 0.6);
      const netDisbursement = isReturned ? -deliveryFeePaisa : collectedCodPaisa - deliveryFeePaisa;

      let settlementStatus: 'settled_in_bank' | 'pending_courier' | 'discrepancy' = 'pending_courier';
      if (isPaid && isDelivered) {
        settlementStatus = 'settled_in_bank';
      } else if (isReturned) {
        settlementStatus = 'settled_in_bank';
      }

      const courierName =
        r.courier === 'steadfast'
          ? 'Steadfast Courier'
          : r.courier.charAt(0).toUpperCase() + r.courier.slice(1);

      return {
        id: r.shipmentId,
        orderNumber: r.orderNo,
        consignmentId: r.consignmentId,
        courierName,
        customerName: r.guestName ?? snapshot.recipientName ?? 'Customer',
        customerPhone: r.guestPhone ?? snapshot.phone ?? '',
        bookedCodPaisa: r.codAmount,
        collectedCodPaisa,
        deliveryFeePaisa,
        productCogsPaisa,
        netDisbursementExpectedPaisa: netDisbursement,
        settlementStatus,
        disbursementDate: isPaid ? r.createdAt.toISOString() : undefined,
        notes: isReturned
          ? 'Customer returned parcel. Restocked in batch.'
          : isDelivered
          ? 'Delivered to customer.'
          : 'In transit / awaiting courier delivery update.',
      };
    });

    return apiSuccess(records, { count: records.length });
  } catch (err) {
    console.error('[GET /api/v1/admin/reconciliation] Failed:', err);
    return apiError(
      'RECONCILIATION_FAILED',
      err instanceof Error ? err.message : 'Could not fetch reconciliation records',
      500
    );
  }
}
