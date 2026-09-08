// app/api/v1/admin/categories/route.ts
// GET / POST /api/v1/admin/categories — Category management
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { listCategories } from '@/lib/services/categories';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/guard';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Read is gated too: the storefront has its own public /api/v1/categories.
  const guard = await requireAdmin('category.read');
  if (!guard.ok) return guard.response;

  try {
    const items = await listCategories();
    return apiSuccess(items);
  } catch (err: any) {
    return apiError('CATEGORIES_FETCH_FAILED', err?.message || 'Failed to fetch categories', 500);
  }
}

export async function POST(req: NextRequest) {
  // Without this the endpoint let anyone on the internet write to the catalog
  // taxonomy (§14.1 — every admin mutation goes through the permission gate).
  const guard = await requireAdmin('category.write');
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json();
    if (!body?.nameEn || typeof body.nameEn !== 'string' || !body.nameEn.trim()) {
      return apiError('VALIDATION_ERROR', 'nameEn is required', 422, 'nameEn');
    }
    const slug = (body.slug || body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).trim();

    const [inserted] = await db
      .insert(categories)
      .values({
        slug,
        nameEn: body.nameEn,
        nameBn: body.nameBn || body.nameEn,
        imagePath: body.imagePath || null,
        parentId: body.parentId || null,
        sort: Number(body.sort) || 0,
        showOnHomepage: body.showOnHomepage !== undefined ? Boolean(body.showOnHomepage) : true,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: new Date(),
      })
      .returning();

    return apiSuccess(inserted, undefined, 201);
  } catch (err: any) {
    console.error('[Admin Category Create] Error:', err);
    return apiError('CATEGORY_CREATE_FAILED', err?.message || 'Failed to create category', 500);
  }
}
