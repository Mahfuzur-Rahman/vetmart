// app/api/v1/drug-classifications/route.ts
// GET /api/v1/drug-classifications — Public drug classifications list
import { NextRequest } from 'next/server';
import { listDrugClassifications } from '@/lib/services/drug-classifications-server';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const menuOnly = url.searchParams.get('menu') === 'true';
    const homepageOnly = url.searchParams.get('homepage') === 'true';

    const items = await listDrugClassifications({
      showOnMenu: menuOnly ? true : undefined,
      showOnHomepage: homepageOnly ? true : undefined,
      isActive: true,
    });

    return apiSuccess(items);
  } catch (err: any) {
    return apiError('DRUG_CLASSIFICATIONS_FETCH_FAILED', err?.message || 'Failed to fetch drug classifications', 500);
  }
}
