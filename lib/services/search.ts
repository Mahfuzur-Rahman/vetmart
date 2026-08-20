// lib/services/search.ts
// Unified catalog search combining generic name, brand name, Banglish keywords (§6, §20)
import { eq, and, sql as dSql, ilike, or, arrayOverlaps, asc, desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productImages, categories, manufacturers, stockLedger, productBatches } from '@/lib/db/schema';
import { normalizeDigits } from '@/lib/i18n/number';
import { getStorageDriver } from '@/lib/storage';
import { isDemoMode } from '@/lib/demo';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';

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

  // Demo mode never touches the database (§4.3). Without this guard the query
  // below throws, /api/v1/products returns 500, and every client silently falls
  // back to its own localStorage — which is how per-device catalogs happened.
  if (isDemoMode()) {
    return filterSeedCatalog(params, page, pageSize);
  }

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

  // Derive sellable stock & resolve the card image for each product.
  //
  // These were previously two queries PER ROW inside a Promise.all. With
  // DB_POOL_MAX=1 on serverless those serialize, so a 48-item page issued ~96
  // sequential round trips to Mumbai and could exceed Vercel's 10s function
  // limit. Both are now single batched queries keyed by product id.
  const productIds = rows.map((r) => r.id);
  const storage = getStorageDriver();

  const stockByProduct = new Map<string, number>();
  const imageByProduct = new Map<string, string>();

  if (productIds.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 60);

    // Sellable stock excludes batches within 60 days of expiry (§5.3).
    const stockRows = await db
      .select({
        productId: stockLedger.productId,
        sellable: dSql<number>`coalesce(sum(
          CASE WHEN ${productBatches.expiryDate} > ${cutoff.toISOString()}
          THEN ${stockLedger.delta} ELSE 0 END
        ), 0)::int`,
      })
      .from(stockLedger)
      .innerJoin(productBatches, eq(stockLedger.batchId, productBatches.id))
      .where(inArray(stockLedger.productId, productIds))
      .groupBy(stockLedger.productId);

    for (const row of stockRows) {
      stockByProduct.set(row.productId, row.sellable);
    }

    const imageRows = await db
      .select({
        productId: productImages.productId,
        basePath: productImages.basePath,
        sort: productImages.sort,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sort));

    // First row per product wins, matching the previous ORDER BY sort LIMIT 1.
    for (const row of imageRows) {
      if (!imageByProduct.has(row.productId) && row.basePath) {
        imageByProduct.set(row.productId, row.basePath);
      }
    }
  }

  const items: CatalogSearchItem[] = rows.map((row) => {
    const basePath = imageByProduct.get(row.id);
    return {
      ...row,
      sellableStock: Math.max(0, stockByProduct.get(row.id) ?? 0),
      imageUrl: basePath ? storage.url(basePath, 'card') : '/images/cal-d-mag.jpg',
    };
  });

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Demo-mode catalog: the same filtering and sorting semantics as the SQL path,
 * applied to the in-repo seed catalog. Keeps DEMO_MODE=true a faithful preview
 * of the real storefront rather than a differently-behaving stub.
 */
function filterSeedCatalog(
  params: CatalogSearchParams,
  page: number,
  pageSize: number
): CatalogSearchResult {
  let list = [...MOCK_PRODUCTS];

  if (params.species) {
    list = list.filter((p) => p.targetSpecies?.includes(params.species!));
  }

  if (params.categorySlug) {
    list = list.filter((p) => p.categorySlug === params.categorySlug);
  }

  if (params.productType) {
    list = list.filter((p) => (p.requiresPrescription ? 'drug_rx' : 'drug_otc') === params.productType);
  }

  if (params.q) {
    const q = normalizeDigits(params.q.trim()).toLowerCase();
    list = list.filter(
      (p) =>
        p.nameEn.toLowerCase().includes(q) ||
        p.nameBn.toLowerCase().includes(q) ||
        p.genericName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.banglishKeywords ?? '').toLowerCase().includes(q)
    );
  }

  switch (params.sort) {
    case 'price_asc':
      list.sort((a, b) => a.salePrice - b.salePrice);
      break;
    case 'price_desc':
      list.sort((a, b) => b.salePrice - a.salePrice);
      break;
    case 'newest':
      break; // seed order is already newest-first
    default:
      list.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
      break;
  }

  const totalCount = list.length;
  const offset = (page - 1) * pageSize;

  const items = list.slice(offset, offset + pageSize).map((p) => ({
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    nameEn: p.nameEn,
    nameBn: p.nameBn,
    genericName: p.genericName,
    productType: p.requiresPrescription ? 'drug_rx' : 'drug_otc',
    dosageForm: p.dosageForm ?? null,
    packSize: p.packSize ?? null,
    targetSpecies: p.targetSpecies ?? [],
    requiresPrescription: !!p.requiresPrescription,
    requiresColdChain: !!p.requiresColdChain,
    mrp: p.mrp,
    salePrice: p.salePrice,
    categoryNameEn: p.categoryNameEn ?? null,
    categoryNameBn: p.categoryNameBn ?? null,
    manufacturerName: p.manufacturerName ?? null,
    sellableStock: p.stockQty ?? 0,
    imageUrl: p.imageUrl,
  }));

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}
