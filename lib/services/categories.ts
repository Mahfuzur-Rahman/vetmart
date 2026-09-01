// lib/services/categories.ts
// Category tree and navigation queries (§6, §7)
import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/db/schema';

export interface CategoryNode {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  imagePath: string | null;
  sort: number;
  children: CategoryNode[];
}

/**
 * Fetch the full category tree (root categories with nested children).
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sort));

    // Build a tree from the flat list
    const nodeMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    for (const cat of allCategories) {
      nodeMap.set(cat.id, {
        id: cat.id,
        slug: cat.slug,
        nameEn: cat.nameEn,
        nameBn: cat.nameBn,
        imagePath: cat.imagePath,
        sort: cat.sort,
        children: [],
      });
    }

    for (const cat of allCategories) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parentId && nodeMap.has(cat.parentId)) {
        nodeMap.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  } catch (err) {
    console.warn('[getCategoryTree] DB fetch failed:', err);
    return [];
  }
}

/**
 * Fetch a single category by slug with its products count context.
 */
export async function getCategoryBySlug(slug: string) {
  try {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    return category ?? null;
  } catch (err) {
    console.warn('[getCategoryBySlug] DB fetch failed:', err);
    return null;
  }
}

/**
 * Flat list of categories with optional filters.
 */
export async function listCategories(opts?: { showOnHomepage?: boolean; isActive?: boolean }) {
  try {
    const conditions = [];
    if (opts?.isActive !== undefined) {
      conditions.push(eq(categories.isActive, opts.isActive));
    }
    if (opts?.showOnHomepage !== undefined) {
      conditions.push(eq(categories.showOnHomepage, opts.showOnHomepage));
    }

    return await db
      .select({
        id: categories.id,
        slug: categories.slug,
        nameEn: categories.nameEn,
        nameBn: categories.nameBn,
        imagePath: categories.imagePath,
        parentId: categories.parentId,
        sort: categories.sort,
        showOnHomepage: categories.showOnHomepage,
        isActive: categories.isActive,
      })
      .from(categories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(categories.sort), asc(categories.nameEn));
  } catch (err) {
    console.warn('[listCategories] DB fetch failed:', err);
    return [];
  }
}

/**
 * Permanently deletes a category.
 * Fails if any products are still assigned to this category.
 */
export async function deleteCategory(id: string) {
  return db.transaction(async (tx) => {
    // 1. Ensure the category exists
    const [existing] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existing) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    // 2. Prevent deletion if there are active products
    const [linkedProduct] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1);

    if (linkedProduct) {
      const err = new Error('CANNOT_DELETE_HAS_PRODUCTS');
      err.name = 'ConstraintViolationError';
      throw err;
    }

    // 3. Prevent deletion if it has subcategories
    const [linkedChild] = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1);

    if (linkedChild) {
      const err = new Error('CANNOT_DELETE_HAS_SUBCATEGORIES');
      err.name = 'ConstraintViolationError';
      throw err;
    }

    // 4. Delete the category
    await tx.delete(categories).where(eq(categories.id, id));

    return { success: true, deletedId: id };
  });
}
