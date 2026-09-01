// lib/services/species-server.ts
// Server-only database operations for species categories (§7, §14)
import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { speciesCategories, products } from '@/lib/db/schema';
import { SPECIES, type SpeciesInfo } from './species';
import { sql } from 'drizzle-orm';

/**
 * List species from the database with multi-criteria filtering.
 */
export async function listSpecies(opts?: { showOnHomepage?: boolean; isActive?: boolean }): Promise<SpeciesInfo[]> {
  try {
    const conditions = [];
    if (opts?.isActive !== undefined) {
      conditions.push(eq(speciesCategories.isActive, opts.isActive));
    }
    if (opts?.showOnHomepage !== undefined) {
      conditions.push(eq(speciesCategories.showOnHomepage, opts.showOnHomepage));
    }

    const rows = await db
      .select({
        id: speciesCategories.id,
        key: speciesCategories.key,
        slug: speciesCategories.slug,
        nameEn: speciesCategories.nameEn,
        nameBn: speciesCategories.nameBn,
        emoji: speciesCategories.emoji,
        imagePath: speciesCategories.imagePath,
        descriptionEn: speciesCategories.descriptionEn,
        descriptionBn: speciesCategories.descriptionBn,
        sort: speciesCategories.sort,
        showOnHomepage: speciesCategories.showOnHomepage,
        isActive: speciesCategories.isActive,
      })
      .from(speciesCategories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(speciesCategories.sort), asc(speciesCategories.nameEn));

    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        key: r.key,
        slug: r.slug,
        nameEn: r.nameEn,
        nameBn: r.nameBn,
        emoji: r.emoji,
        imagePath: r.imagePath,
        sort: r.sort,
        showOnHomepage: r.showOnHomepage,
        isActive: r.isActive,
        description: {
          en: r.descriptionEn || '',
          bn: r.descriptionBn || '',
        },
      }));
    }

    // Fallback if DB returns empty
    let fallback = SPECIES;
    if (opts?.showOnHomepage !== undefined) {
      fallback = fallback.filter((s) => s.showOnHomepage === opts.showOnHomepage);
    }
    if (opts?.isActive !== undefined) {
      fallback = fallback.filter((s) => s.isActive === opts.isActive);
    }
    return fallback;
  } catch (err) {
    console.warn('[listSpecies] DB fetch failed, returning static fallback:', err);
    let fallback = SPECIES;
    if (opts?.showOnHomepage !== undefined) {
      fallback = fallback.filter((s) => s.showOnHomepage === opts.showOnHomepage);
    }
    return fallback;
  }
}

/**
 * Permanently deletes a species category.
 * Fails if any products are still assigned to this species via JSONB array.
 */
export async function deleteSpecies(id: string) {
  return db.transaction(async (tx) => {
    // 1. Ensure the species exists
    const [existing] = await tx
      .select({ id: speciesCategories.id, key: speciesCategories.key })
      .from(speciesCategories)
      .where(eq(speciesCategories.id, id))
      .limit(1);

    if (!existing) {
      throw new Error('SPECIES_NOT_FOUND');
    }

    // 2. Prevent deletion if there are active products using this species key in their targetSpecies array
    const [linkedProduct] = await tx
      .select({ id: products.id })
      .from(products)
      .where(sql`${products.targetSpecies} ? ${existing.key}`)
      .limit(1);

    if (linkedProduct) {
      const err = new Error('CANNOT_DELETE_HAS_PRODUCTS');
      err.name = 'ConstraintViolationError';
      throw err;
    }

    // 3. Delete the species
    await tx.delete(speciesCategories).where(eq(speciesCategories.id, id));

    return { success: true, deletedId: id };
  });
}
