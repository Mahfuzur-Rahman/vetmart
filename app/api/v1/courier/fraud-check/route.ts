// app/api/v1/courier/fraud-check/route.ts
// GET /api/v1/courier/fraud-check — Courier return-rate score for a phone (§12 rule 3)
import { NextRequest } from 'next/server';
import { checkCustomerFraudRisk, normalizeBdPhone } from '@/lib/courier/fraud-check';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/guard';

export async function GET(req: NextRequest) {
  // A customer's courier history is operator-only data, and the upstream lookup
  // is a metered call. Unauthenticated, this was a free phone-number oracle.
  const guard = await requireAdmin('order.read');
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return apiError('VALIDATION_ERROR', 'A phone parameter is required.', 422, 'phone');
  }

  const cleanPhone = normalizeBdPhone(phone);
  if (!cleanPhone || cleanPhone.length < 11) {
    return apiError('INVALID_PHONE', 'Enter a valid Bangladeshi mobile number.', 422, 'phone');
  }

  try {
    const report = await checkCustomerFraudRisk(cleanPhone);
    return apiSuccess(report);
  } catch (err) {
    console.error('[GET /api/v1/courier/fraud-check] Failed:', err);
    return apiError(
      'FRAUD_CHECK_FAILED',
      err instanceof Error ? err.message : 'Fraud check failed',
      500
    );
  }
}
