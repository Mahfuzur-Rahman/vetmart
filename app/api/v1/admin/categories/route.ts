// app/api/v1/admin/categories/route.ts
// GET / POST /api/v1/admin/categories — Category management
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { listCategories } from '@/lib/services/categories';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listCategories();
    return apiSuccess(items);
  } catch (err: any) {
    return apiError('CATEGORIES_FETCH_FAILED', err?.message || 'Failed to fetch categories', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
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
