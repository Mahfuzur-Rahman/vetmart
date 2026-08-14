// app/api/v1/admin/orders/[orderId]/ship/route.ts
// POST /api/v1/admin/orders/:orderId/ship — Create courier consignment (§12)
import { NextRequest } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { createShipmentForOrder } from '@/lib/services/fulfillment';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ orderId: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth || !auth.has('order.write')) {
      return apiError('FORBIDDEN', 'Insufficient permissions (order.write required).', 403);
    }

    const { orderId } = await params;
    const result = await createShipmentForOrder(orderId, auth.admin.id);

    if (!result.success) {
      return apiError('SHIPMENT_FAILED', result.error || 'Failed to create shipment.', 400);
    }

    return apiSuccess({
      orderId,
      consignmentId: result.consignmentId,
      trackingCode: result.trackingCode,
    });
  } catch (err: any) {
    return apiError('SHIPMENT_ERROR', err?.message || 'Shipping creation failed', 500);
  }
}
