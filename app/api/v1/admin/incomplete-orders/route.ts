// app/api/v1/admin/incomplete-orders/route.ts
// Admin API to list incomplete orders and abandoned leads
import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getIncompleteOrders } from '@/lib/services/incomplete-orders';
import { requireAdmin } from '@/lib/api/guard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Leads carry customer name, phone and address; never publicly readable.
  const guard = await requireAdmin('order.read');
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;

    const leads = await getIncompleteOrders(status);

    const pendingCount = leads.filter((l) => l.status === 'incomplete').length;
    const contactedCount = leads.filter((l) => l.status === 'contacted').length;
    const convertedCount = leads.filter((l) => l.status === 'converted').length;
    const potentialRevenuePaisa = leads
      .filter((l) => l.status === 'incomplete' || l.status === 'contacted')
      .reduce((sum, l) => sum + l.totalAmount, 0);

    return apiSuccess(leads, {
      total: leads.length,
      pendingCount,
      contactedCount,
      convertedCount,
      potentialRevenuePaisa,
    });
  } catch (err: any) {
    return apiError('LEADS_FETCH_FAILED', err?.message || 'Failed to fetch incomplete orders', 500);
  }
}
