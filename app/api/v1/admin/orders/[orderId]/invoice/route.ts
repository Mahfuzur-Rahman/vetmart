// app/api/v1/admin/orders/[orderId]/invoice/route.ts
// POST /api/v1/admin/orders/:orderId/invoice — Generate invoice PDF (§11)
import { NextRequest } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import { generateInvoicePdf } from '@/lib/services/fulfillment';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ orderId: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth || !auth.has('order.read')) {
      return apiError('FORBIDDEN', 'Insufficient permissions (order.read required).', 403);
    }

    const { orderId } = await params;
    const result = await generateInvoicePdf(orderId);

    if (!result.success) {
      return apiError('INVOICE_FAILED', result.error || 'Invoice generation failed.', 400);
    }

    return apiSuccess({ orderId, pdfPath: result.path });
  } catch (err: any) {
    return apiError('INVOICE_ERROR', err?.message || 'Invoice generation failed', 500);
  }
}
