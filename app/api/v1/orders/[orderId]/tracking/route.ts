// app/api/v1/orders/[orderId]/tracking/route.ts
// GET /api/v1/orders/:orderId/tracking — Customer-facing order tracking timeline (§12)
import { NextRequest } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve';
import { getOrderTracking } from '@/lib/services/fulfillment';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ orderId: string }> };

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Login required to view tracking.', 401);
    }

    const { orderId } = await params;
    const tracking = await getOrderTracking(orderId, user.id);

    if (!tracking) {
      return apiError('NOT_FOUND', 'Order not found or does not belong to you.', 404);
    }

    return apiSuccess(tracking);
  } catch (err: any) {
    return apiError('TRACKING_ERROR', err?.message || 'Failed to load tracking info', 500);
  }
}
