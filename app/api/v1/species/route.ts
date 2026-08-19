import { NextRequest } from 'next/server';
import { listSpecies } from '@/lib/services/species-server';
import { apiSuccess, apiError } from '@/lib/api/response';


export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const homepageOnly = url.searchParams.get('homepage') === 'true';

    const items = await listSpecies({
      isActive: true,
      showOnHomepage: homepageOnly ? true : undefined,
    });

    return apiSuccess(items);
  } catch (err: any) {
    return apiError('SPECIES_QUERY_FAILED', err?.message || 'Failed to query species', 500);
  }
}
