// app/api/v1/courier/dispatch-bulk/route.ts
// POST /api/v1/courier/dispatch-bulk — Hand a batch of orders to the courier (§12, §14.2)
import { NextRequest } from 'next/server';
import { bulkDispatchOrders, type DispatchableOrder } from '@/lib/services/courier-booking';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/guard';

export async function POST(req: NextRequest) {
  // This creates real consignments at the courier and real COD liabilities.
  // Unauthenticated, it let anyone on the internet dispatch shipments.
  const guard = await requireAdmin('order.write');
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body is not valid JSON', 400);
  }

  const { orders } = (body ?? {}) as { orders?: DispatchableOrder[] };

  if (!orders || !Array.isArray(orders) || orders.length === 0) {
    return apiError('VALIDATION_ERROR', 'An array of orders is required.', 422, 'orders');
  }

  if (orders.length > 100) {
    return apiError('BATCH_TOO_LARGE', 'Dispatch at most 100 orders per request.', 422, 'orders');
  }

  try {
    const report = await bulkDispatchOrders(orders);
    return apiSuccess(report);
  } catch (err) {
    console.error('[POST /api/v1/courier/dispatch-bulk] Failed:', err);
    return apiError(
      'BULK_DISPATCH_FAILED',
      err instanceof Error ? err.message : 'Bulk dispatch failed',
      500
    );
  }
}
