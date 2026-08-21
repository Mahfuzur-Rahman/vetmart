import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { speciesCategories } from '@/lib/db/schema';
import { listSpecies } from '@/lib/services/species-server';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listSpecies();
    return apiSuccess(items);
  } catch (err: any) {
    return apiError('SPECIES_FETCH_FAILED', err?.message || 'Failed to fetch species', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const key = (body.key || body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')).trim();
    const slug = (body.slug || body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).trim();

    const [inserted] = await db
      .insert(speciesCategories)
      .values({
        key,
        slug,
        nameEn: body.nameEn,
        nameBn: body.nameBn || body.nameEn,
        emoji: body.emoji || '🐾',
        imagePath: body.imagePath || null,
        descriptionEn: body.descriptionEn || '',
        descriptionBn: body.descriptionBn || '',
        sort: Number(body.sort) || 0,
        showOnHomepage: body.showOnHomepage !== undefined ? Boolean(body.showOnHomepage) : true,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return apiSuccess(inserted, undefined, 201);
  } catch (err: any) {
    console.error('[Admin Species Create] Error:', err);
    return apiError('SPECIES_CREATE_FAILED', err?.message || 'Failed to create species category', 500);
  }
}
