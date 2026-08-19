// app/api/v1/admin/categories/[id]/route.ts
// PUT / DELETE /api/v1/admin/categories/:id — Category update & deletion
import { NextRequest } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const lookup = isUuid ? eq(categories.id, id) : eq(categories.slug, id);

    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(lookup);

    if (!existing) {
      return apiError('NOT_FOUND', 'Category not found', 404);
    }

    const updatePayload: Record<string, any> = {};

    if (body.nameEn !== undefined) updatePayload.nameEn = body.nameEn;
    if (body.nameBn !== undefined) updatePayload.nameBn = body.nameBn;
    if (body.imagePath !== undefined) updatePayload.imagePath = body.imagePath;
    if (body.sort !== undefined) updatePayload.sort = Number(body.sort);
    if (body.showOnHomepage !== undefined) updatePayload.showOnHomepage = Boolean(body.showOnHomepage);
    if (body.isActive !== undefined) updatePayload.isActive = Boolean(body.isActive);

    const [updated] = await db
      .update(categories)
      .set(updatePayload)
      .where(eq(categories.id, existing.id))
      .returning();

    return apiSuccess(updated);
  } catch (err: any) {
    console.error('[Admin Category Update] Error:', err);
    return apiError('CATEGORY_UPDATE_FAILED', err?.message || 'Failed to update category', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const lookup = isUuid ? eq(categories.id, id) : eq(categories.slug, id);

    const [deleted] = await db
      .delete(categories)
      .where(lookup)
      .returning({ id: categories.id, slug: categories.slug });

    if (!deleted) {
      return apiError('NOT_FOUND', 'Category not found', 404);
    }

    return apiSuccess({
      deletedId: deleted.id,
      deletedSlug: deleted.slug,
      message: 'Category deleted successfully',
    });
  } catch (err: any) {
    console.error('[Admin Category Delete] Error:', err);
    return apiError('CATEGORY_DELETE_FAILED', err?.message || 'Failed to delete category', 500);
  }
}
