// app/api/v1/admin/orders/[orderId]/status/route.ts
// PATCH /api/v1/admin/orders/:orderId/status — Transition order status (§5.5)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedAdmin, hasPermission } from '@/lib/auth/permissions';
import { transitionOrderStatus } from '@/lib/services/fulfillment';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ orderId: string }> };

const statusSchema = z.object({
  status: z.string(),
  note: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth || !auth.has('order.write')) {
      return apiError('FORBIDDEN', 'Insufficient permissions (order.write required).', 403);
    }

    const { orderId } = await params;
    const body = await req.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Valid status string is required.', 422);
    }

    const result = await transitionOrderStatus(
      orderId,
      parsed.data.status as any,
      auth.admin.id,
      parsed.data.note
    );

    if (!result.success) {
      return apiError('TRANSITION_FAILED', result.error || 'Status transition failed.', 400);
    }

    return apiSuccess({ orderId, status: parsed.data.status });
  } catch (err: any) {
    return apiError('ORDER_STATUS_ERROR', err?.message || 'Failed to update order status', 500);
  }
}
