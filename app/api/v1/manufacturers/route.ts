// app/api/v1/manufacturers/route.ts
// GET /api/v1/manufacturers — Manufacturer listing (§9)
import { listManufacturers } from '@/lib/services/manufacturers';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mfgs = await listManufacturers();
    return apiSuccess(mfgs);
  } catch (err: any) {
    return apiError('MANUFACTURERS_FETCH_FAILED', err?.message || 'Failed to fetch manufacturers', 500);
  }
}
