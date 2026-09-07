// app/api/v1/admin/settings/route.ts
// Admin API for reading and modifying system settings (§6, §14.1, §14.3)
import { NextRequest } from 'next/server';
import { getShippingSettings, updateShippingSettings } from '@/lib/services/settings';
import { requireAdmin } from '@/lib/api/guard';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireAdmin('settings.read');
  if (!guard.ok) return guard.response;

  try {
    const shipping = await getShippingSettings();
    return apiSuccess({ shipping });
  } catch (err) {
    console.error('[GET /api/v1/admin/settings] Failed:', err);
    return apiError('SETTINGS_LOAD_FAILED', 'Could not load system settings', 500);
  }
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin('settings.write');
  if (!guard.ok) return guard.response;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body is not valid JSON', 400);
  }

  try {
    const updated = await updateShippingSettings(body.shipping || body, guard.admin.id);
    return apiSuccess({ shipping: updated });
  } catch (err) {
    console.error('[PUT /api/v1/admin/settings] Update failed:', err);
    return apiError('SETTINGS_UPDATE_FAILED', 'Could not save system settings', 500);
  }
}
