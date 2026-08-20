// app/api/v1/admin/orders/route.ts
// GET /api/v1/admin/orders — Order board listing (§9, §14.2)
//
// Thin transport over lib/services/orders.ts (§2 rule 1). Orders contain
// customer names, phone numbers and addresses, so this route is gated on
// order.read — it must never be publicly readable.
import { NextRequest } from 'next/server';
import { listOrdersForAdmin } from '@/lib/services/orders';
import { requireAdmin } from '@/lib/api/guard';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin('order.read');
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10)));

    const items = await listOrdersForAdmin(limit);
    return apiSuccess(items, { count: items.length });
  } catch (err) {
    console.error('[GET /api/v1/admin/orders] Failed:', err);
    return apiError(
      'ORDER_LIST_FAILED',
      err instanceof Error ? err.message : 'Could not load orders',
      500
    );
  }
}
