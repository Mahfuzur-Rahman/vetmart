// app/api/v1/admin/drug-classifications/route.ts
// GET / POST /api/v1/admin/drug-classifications — Admin management
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { drugClassifications } from '@/lib/db/schema';
import { listDrugClassifications, ensureDrugClassificationsTable } from '@/lib/services/drug-classifications-server';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listDrugClassifications();
    return apiSuccess(items);
  } catch (err: any) {
    return apiError('ADMIN_DRUG_CLASSIFICATIONS_FETCH_FAILED', err?.message || 'Failed to fetch drug classifications', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDrugClassificationsTable();
    const body = await req.json();

    if (!body.nameEn) {
      return apiError('VALIDATION_ERROR', 'nameEn is required', 400);
    }

    const slug = (body.slug || body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).trim();

    const [inserted] = await db
      .insert(drugClassifications)
      .values({
        slug,
        nameEn: body.nameEn.trim(),
        nameBn: (body.nameBn || body.nameEn).trim(),
        emoji: body.emoji || '💊',
        descriptionEn: body.descriptionEn || null,
        descriptionBn: body.descriptionBn || null,
        sort: Number(body.sort) || 0,
        showOnMenu: body.showOnMenu !== undefined ? Boolean(body.showOnMenu) : true,
        showOnHomepage: body.showOnHomepage !== undefined ? Boolean(body.showOnHomepage) : true,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return apiSuccess(inserted, undefined, 201);
  } catch (err: any) {
    console.error('[Admin Drug Classification Create] Error:', err);
    return apiError('DRUG_CLASSIFICATION_CREATE_FAILED', err?.message || 'Failed to create drug classification', 500);
  }
}
