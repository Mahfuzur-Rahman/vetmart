// app/api/v1/admin/drug-classifications/[id]/route.ts
// PUT / DELETE /api/v1/admin/drug-classifications/[id] — Update & Delete
import { NextRequest } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { drugClassifications } from '@/lib/db/schema';
import { ensureDrugClassificationsTable, deleteDrugClassification } from '@/lib/services/drug-classifications-server';
import { apiSuccess, apiError } from '@/lib/api/response';
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';

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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedAdmin();
  if (!auth) return apiError('UNAUTHORIZED', 'You must be logged in as an admin', 401);
  if (!auth.permissions.has('*')) {
    return apiError('FORBIDDEN', 'Only SuperAdmin can permanently delete drug classifications', 403);
  }

  const { id } = await params;
  
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let targetId = id;

    if (!isUuid) {
      const [existing] = await db
        .select({ id: drugClassifications.id })
        .from(drugClassifications)
        .where(eq(drugClassifications.slug, id));
      
      if (!existing) return apiError('NOT_FOUND', 'Drug Classification not found', 404);
      targetId = existing.id;
    }

    const result = await deleteDrugClassification(targetId);
    return apiSuccess(result);
  } catch (err: any) {
    if (err.message === 'DRUG_CLASS_NOT_FOUND') {
      return apiError('NOT_FOUND', 'Drug Classification not found', 404);
    }
    if (err.message === 'CANNOT_DELETE_HAS_PRODUCTS') {
      return apiError('CANNOT_DELETE', 'Cannot delete drug classification because it has active products.', 409);
    }
    console.error('[Admin Drug Classification Delete] Error:', err);
    return apiError('DRUG_CLASS_DELETE_FAILED', 'Failed to delete drug classification', 500);
  }
}

