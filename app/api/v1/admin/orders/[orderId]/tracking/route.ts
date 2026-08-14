// app/api/v1/admin/orders/[orderId]/tracking/route.ts
// GET /api/v1/admin/orders/:orderId/tracking — Admin order tracking timeline (§12, §14.1)
import { NextRequest } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { getOrderTracking } from '@/lib/services/fulfillment';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth || !auth.has('order.read')) {
      return apiError('FORBIDDEN', 'Insufficient permissions (order.read required).', 403);
    }

    const { orderId } = await params;

    // Admin can view any order tracking — no userId scoping
    const tracking = await getOrderTracking(orderId);

    if (!tracking) {
      return apiError('NOT_FOUND', 'Order not found.', 404);
    }

    return apiSuccess(tracking);
  } catch (err: any) {
    return apiError('TRACKING_ERROR', err?.message || 'Failed to load tracking info', 500);
  }
}
