// app/api/v1/admin/prescriptions/[rxId]/route.ts
// PATCH /api/v1/admin/prescriptions/:rxId — Approve or reject prescription (§5.5)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { approvePrescription, rejectPrescription } from '@/lib/services/fulfillment';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ rxId: string }> };

const rxSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().max(500).optional(),
  reason: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth || !auth.has('prescription.approve')) {
      return apiError('FORBIDDEN', 'Insufficient permissions (prescription.approve required).', 403);
    }

    const { rxId } = await params;
    const body = await req.json();
    const parsed = rxSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Valid action (approve/reject) is required.', 422);
    }

    let result;
    if (parsed.data.action === 'approve') {
      result = await approvePrescription(rxId, auth.admin.id, parsed.data.note);
    } else {
      if (!parsed.data.reason) {
        return apiError('VALIDATION_ERROR', 'Rejection reason is required.', 422);
      }
      result = await rejectPrescription(rxId, auth.admin.id, parsed.data.reason);
    }

    if (!result.success) {
      return apiError('RX_ACTION_FAILED', result.error || 'Prescription action failed.', 400);
    }

    return apiSuccess({ rxId, action: parsed.data.action });
  } catch (err: any) {
    return apiError('RX_ERROR', err?.message || 'Prescription action failed', 500);
  }
}
