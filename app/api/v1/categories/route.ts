// app/api/v1/categories/route.ts
// GET /api/v1/categories — Category tree (§9)
import { getCategoryTree } from '@/lib/services/categories';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET() {
  try {
    const tree = await getCategoryTree();
    return apiSuccess(tree);
  } catch (err: any) {
    return apiError('CATEGORIES_FETCH_FAILED', err?.message || 'Failed to fetch categories', 500);
  }
}
