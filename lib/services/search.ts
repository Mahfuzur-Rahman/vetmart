// lib/services/search.ts
// Unified catalog search combining generic name, brand name, Banglish keywords (§6, §20)
import { eq, and, sql as dSql, ilike, or, arrayOverlaps, asc, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productImages, categories, manufacturers, stockLedger, productBatches } from '@/lib/db/schema';
import { normalizeDigits } from '@/lib/i18n/number';
import { getStorageDriver } from '@/lib/storage';

export type SortOption = 'relevance' | 'price_asc' | 'price_desc' | 'newest';

export interface CatalogSearchParams {
  q?: string;              // free-text query
  species?: string;        // species key from SPECIES list
  categorySlug?: string;   // category slug
  manufacturerId?: string;
  productType?: string;    // 'drug_otc' | 'drug_rx' | 'vaccine' etc.
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface CatalogSearchResult {
  items: CatalogSearchItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CatalogSearchItem {
  id: string;
  slug: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  genericName: string | null;
  productType: string;
  dosageForm: string | null;
  packSize: string | null;
  targetSpecies: string[];
  requiresPrescription: boolean;
  requiresColdChain: boolean;
  mrp: number;
  salePrice: number;
  categoryNameEn: string | null;
  categoryNameBn: string | null;
  manufacturerName: string | null;
  sellableStock: number;
  imageUrl?: string;
}

/**
 * Search the product catalog with multi-criteria filtering.
 *
 * Search strategy (§20):
 * 1. Normalize Bengali digits in query.
 * 2. Use ILIKE for fuzzy matching across name_en, name_bn, generic_name, banglish_keywords.
 * 3. Filter by species via array overlap.
 * 4. Apply sort and pagination.
 */
export async function searchCatalog(params: CatalogSearchParams): Promise<CatalogSearchResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 24));
  const offset = (page - 1) * pageSize;

  // Build WHERE conditions
  const conditions = [eq(products.isActive, true)];

  if (params.species) {
    conditions.push(arrayOverlaps(products.targetSpecies, [params.species]));
  }

  if (params.categorySlug) {
    conditions.push(eq(categories.slug, params.categorySlug));
  }

  if (params.manufacturerId) {
    conditions.push(eq(products.manufacturerId, params.manufacturerId));
  }

  if (params.productType) {
    conditions.push(eq(products.productType, params.productType as any));
  }

  if (params.q) {
    const normalized = normalizeDigits(params.q.trim());
    const pattern = `%${normalized}%`;
    conditions.push(
      or(
        ilike(products.nameEn, pattern),
        ilike(products.nameBn, pattern),
        ilike(products.genericName, pattern),
        ilike(products.banglishKeywords, pattern),
        ilike(products.sku, pattern)
      )!
    );
  }

  const whereClause = and(...conditions);

  // Count total matching items
  const [countResult] = await db
    .select({ count: dSql<number>`count(*)::int` })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(whereClause);

  const totalCount = countResult?.count ?? 0;

  // Determine sort order
  let orderBy;
  switch (params.sort) {
    case 'price_asc':
      orderBy = asc(products.salePrice);
      break;
    case 'price_desc':
      orderBy = desc(products.salePrice);
      break;
    case 'newest':
      orderBy = desc(products.createdAt);
      break;
    default:
      orderBy = asc(products.nameEn);
      break;
  }

  // Fetch items
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      sku: products.sku,
      nameEn: products.nameEn,
      nameBn: products.nameBn,
      genericName: products.genericName,
      productType: products.productType,
      dosageForm: products.dosageForm,
      packSize: products.packSize,
      targetSpecies: products.targetSpecies,
      requiresPrescription: products.requiresPrescription,
      requiresColdChain: products.requiresColdChain,
      mrp: products.mrp,
      salePrice: products.salePrice,
      categoryNameEn: categories.nameEn,
      categoryNameBn: categories.nameBn,
      manufacturerName: manufacturers.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset);

  // Derive sellable stock & Cloudinary image for each product
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);
  const storage = getStorageDriver();

  const items: CatalogSearchItem[] = await Promise.all(
    rows.map(async (row) => {
      const [stockResult] = await db
        .select({
          sellable: dSql<number>`coalesce(sum(
            CASE WHEN ${productBatches.expiryDate} > ${cutoff.toISOString()}
            THEN ${stockLedger.delta} ELSE 0 END
          ), 0)::int`,
        })
        .from(stockLedger)
        .innerJoin(productBatches, eq(stockLedger.batchId, productBatches.id))
        .where(eq(stockLedger.productId, row.id));

      const [imgRow] = await db
        .select({ basePath: productImages.basePath })
        .from(productImages)
        .where(eq(productImages.productId, row.id))
        .orderBy(asc(productImages.sort))
        .limit(1);

      const imageUrl = imgRow?.basePath
        ? storage.url(imgRow.basePath, 'card')
        : '/images/cal-d-mag.jpg';

      return {
        ...row,
        sellableStock: Math.max(0, stockResult?.sellable ?? 0),
        imageUrl,
      };
    })
  );


  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
