// app/api/v1/admin/drug-classifications/[id]/route.ts
// PUT / DELETE /api/v1/admin/drug-classifications/[id] — Update & Delete
import { NextRequest } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { drugClassifications } from '@/lib/db/schema';
import { ensureDrugClassificationsTable } from '@/lib/services/drug-classifications-server';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDrugClassificationsTable();
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.nameEn !== undefined) updateData.nameEn = body.nameEn;
    if (body.nameBn !== undefined) updateData.nameBn = body.nameBn;
    if (body.emoji !== undefined) updateData.emoji = body.emoji;
    if (body.descriptionEn !== undefined) updateData.descriptionEn = body.descriptionEn;
    if (body.descriptionBn !== undefined) updateData.descriptionBn = body.descriptionBn;
    if (body.sort !== undefined) updateData.sort = Number(body.sort);
    if (body.showOnMenu !== undefined) updateData.showOnMenu = Boolean(body.showOnMenu);
    if (body.showOnHomepage !== undefined) updateData.showOnHomepage = Boolean(body.showOnHomepage);
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const updated = await db
      .update(drugClassifications)
      .set(updateData)
      .where(isUuid ? or(eq(drugClassifications.id, id), eq(drugClassifications.slug, id)) : eq(drugClassifications.slug, id))
      .returning();

    return apiSuccess(updated[0] || updateData);
  } catch (err: any) {
    console.error('[Admin Drug Classification Update] Error:', err);
    return apiError('DRUG_CLASSIFICATION_UPDATE_FAILED', err?.message || 'Failed to update drug classification', 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDrugClassificationsTable();
    const { id } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    await db
      .delete(drugClassifications)
      .where(isUuid ? or(eq(drugClassifications.id, id), eq(drugClassifications.slug, id)) : eq(drugClassifications.slug, id));

    return apiSuccess({ deleted: true, id });
  } catch (err: any) {
    console.error('[Admin Drug Classification Delete] Error:', err);
    return apiError('DRUG_CLASSIFICATION_DELETE_FAILED', err?.message || 'Failed to delete drug classification', 500);
  }
}
