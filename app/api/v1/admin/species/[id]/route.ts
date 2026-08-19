// app/api/v1/admin/species/[id]/route.ts
// PUT / DELETE /api/v1/admin/species/:id — Species update & deletion
import { NextRequest } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { speciesCategories } from '@/lib/db/schema';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const lookup = isUuid ? eq(speciesCategories.id, id) : or(eq(speciesCategories.key, id), eq(speciesCategories.slug, id))!;

    const [existing] = await db
      .select({ id: speciesCategories.id })
      .from(speciesCategories)
      .where(lookup);

    if (!existing) {
      return apiError('NOT_FOUND', 'Species not found', 404);
    }

    const updatePayload: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.nameEn !== undefined) updatePayload.nameEn = body.nameEn;
    if (body.nameBn !== undefined) updatePayload.nameBn = body.nameBn;
    if (body.emoji !== undefined) updatePayload.emoji = body.emoji;
    if (body.imagePath !== undefined) updatePayload.imagePath = body.imagePath;
    if (body.descriptionEn !== undefined) updatePayload.descriptionEn = body.descriptionEn;
    if (body.descriptionBn !== undefined) updatePayload.descriptionBn = body.descriptionBn;
    if (body.sort !== undefined) updatePayload.sort = Number(body.sort);
    if (body.showOnHomepage !== undefined) updatePayload.showOnHomepage = Boolean(body.showOnHomepage);
    if (body.isActive !== undefined) updatePayload.isActive = Boolean(body.isActive);

    const [updated] = await db
      .update(speciesCategories)
      .set(updatePayload)
      .where(eq(speciesCategories.id, existing.id))
      .returning();

    return apiSuccess(updated);
  } catch (err: any) {
    console.error('[Admin Species Update] Error:', err);
    return apiError('SPECIES_UPDATE_FAILED', err?.message || 'Failed to update species', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const lookup = isUuid ? eq(speciesCategories.id, id) : or(eq(speciesCategories.key, id), eq(speciesCategories.slug, id))!;

    const [deleted] = await db
      .delete(speciesCategories)
      .where(lookup)
      .returning({ id: speciesCategories.id, key: speciesCategories.key });

    if (!deleted) {
      return apiError('NOT_FOUND', 'Species not found', 404);
    }

    return apiSuccess({
      deletedId: deleted.id,
      deletedKey: deleted.key,
      message: 'Species category deleted successfully',
    });
  } catch (err: any) {
    console.error('[Admin Species Delete] Error:', err);
    return apiError('SPECIES_DELETE_FAILED', err?.message || 'Failed to delete species', 500);
  }
}
