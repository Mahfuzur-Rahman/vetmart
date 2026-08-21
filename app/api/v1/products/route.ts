// app/api/v1/products/route.ts
// GET /api/v1/products — Catalog search & listing (§9)
import { NextRequest } from 'next/server';
import { searchCatalog, type SortOption } from '@/lib/services/search';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const result = await searchCatalog({
      q: url.searchParams.get('q') || undefined,
      species: url.searchParams.get('species') || undefined,
      categorySlug: url.searchParams.get('category') || undefined,
      manufacturerId: url.searchParams.get('manufacturer') || undefined,
      productType: url.searchParams.get('type') || undefined,
      sort: (url.searchParams.get('sort') as SortOption) || undefined,
      page: parseInt(url.searchParams.get('page') || '1', 10),
      pageSize: parseInt(url.searchParams.get('pageSize') || '24', 10),
    });

    return apiSuccess(result.items, {
      totalCount: result.totalCount,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (err: any) {
    return apiError('SEARCH_FAILED', err?.message || 'Product search failed', 500);
  }
}
