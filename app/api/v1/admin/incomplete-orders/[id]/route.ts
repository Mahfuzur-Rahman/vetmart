// app/api/v1/admin/incomplete-orders/[id]/route.ts
// Admin API to update status, notes, or convert an incomplete lead to confirmed order
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/response';
import { updateIncompleteOrderStatus, type IncompleteOrderStatus } from '@/lib/services/incomplete-orders';
import { requireAdmin } from '@/lib/api/guard';

const updateSchema = z.object({
  status: z.enum(['incomplete', 'contacted', 'converted', 'discarded'] as const),
  adminNotes: z.string().optional(),
});

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Props) {
  const guard = await requireAdmin('order.write');
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid status or payload.', 422);
    }

    const success = await updateIncompleteOrderStatus(id, parsed.data.status, parsed.data.adminNotes);
    if (!success) {
      return apiError('UPDATE_FAILED', 'Could not update lead status', 500);
    }

    return apiSuccess({ id, status: parsed.data.status, adminNotes: parsed.data.adminNotes });
  } catch (err: any) {
    return apiError('LEAD_UPDATE_ERROR', err?.message || 'Error updating lead', 500);
  }
}
