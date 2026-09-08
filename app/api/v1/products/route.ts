// app/api/v1/products/route.ts
// GET /api/v1/products — Catalog search & listing (§9)
import { NextRequest } from 'next/server';
import {
  searchCatalog,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  PUBLIC_MAX_PAGE_SIZE,
  type SortOption,
} from '@/lib/services/search';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAdminSessionId } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    let includeInactive = false;
    if (url.searchParams.get('includeInactive') === 'true') {
      const adminId = await getAdminSessionId();
      if (adminId) {
        includeInactive = true;
      }
    }

    // An admin screen needs the whole catalog in one request; an anonymous
    // storefront caller stays capped so the endpoint cannot be used to dump it.
    const requestedPageSize = Number.parseInt(url.searchParams.get('pageSize') || '', 10);
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.min(includeInactive ? MAX_PAGE_SIZE : PUBLIC_MAX_PAGE_SIZE, Math.max(1, requestedPageSize))
      : DEFAULT_PAGE_SIZE;

    const requestedPage = Number.parseInt(url.searchParams.get('page') || '', 10);

    const result = await searchCatalog({
      q: url.searchParams.get('q') || undefined,
      species: url.searchParams.get('species') || undefined,
      categorySlug: url.searchParams.get('category') || undefined,
      manufacturerId: url.searchParams.get('manufacturer') || undefined,
      productType: url.searchParams.get('type') || undefined,
      sort: (url.searchParams.get('sort') as SortOption) || undefined,
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      pageSize,
      includeInactive,
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
