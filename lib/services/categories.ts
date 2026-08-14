// lib/services/categories.ts
// Category tree and navigation queries (§6, §7)
import { eq, asc, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories } from '@/lib/db/schema';

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
}

/**
 * Fetch a single category by slug with its products count context.
 */
export async function getCategoryBySlug(slug: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  return category ?? null;
}

/**
 * Flat list of all active categories for dropdowns and filters.
 */
export async function listCategories() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameBn: categories.nameBn,
      parentId: categories.parentId,
      sort: categories.sort,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sort));
}
