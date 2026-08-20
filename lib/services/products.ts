// lib/services/products.ts
// Product catalog queries & species navigation (§2 rule 1, §5.2, §7)
import { eq, and, sql as dSql, ilike, or, arrayOverlaps, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  products,
  productImages,
  categories,
  manufacturers,
  productBatches,
  stockLedger,
} from '@/lib/db/schema';
import { getStorageDriver } from '@/lib/storage';
import { getProductStockSummary } from './stock';
import { isDemoMode } from '@/lib/demo';
import {
  productCreateSchema,
  productUpdateSchema,
  buildProductRow,
  buildBatchRow,
} from '@/lib/validation/products';

export interface ProductFilterOptions {
  species?: string; // e.g. 'cattle', 'poultry', 'dog'
  categorySlug?: string;
  manufacturerId?: string;
  genericName?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch a single active product by slug with relations and sellable stock.
 */
export async function getProductBySlug(slug: string) {
  if (isDemoMode()) {
    return null;
  }
  try {
    const [product] = await db
      .select({
        id: products.id,
        slug: products.slug,
        sku: products.sku,
        nameEn: products.nameEn,
        nameBn: products.nameBn,
        genericName: products.genericName,
        productType: products.productType,
        strength: products.strength,
        strengthUnit: products.strengthUnit,
        dosageForm: products.dosageForm,
        packSize: products.packSize,
        packUnit: products.packUnit,
        targetSpecies: products.targetSpecies,
        withdrawalMeatDays: products.withdrawalMeatDays,
        withdrawalMilkHours: products.withdrawalMilkHours,
        dgdaRegistrationNo: products.dgdaRegistrationNo,
        storageCondition: products.storageCondition,
        requiresColdChain: products.requiresColdChain,
        requiresPrescription: products.requiresPrescription,
        isAntimicrobial: products.isAntimicrobial,
        vatRate: products.vatRate,
        mrp: products.mrp,
        salePrice: products.salePrice,
        isActive: products.isActive,
        category: {
          id: categories.id,
          slug: categories.slug,
          nameEn: categories.nameEn,
          nameBn: categories.nameBn,
        },
        manufacturer: {
          id: manufacturers.id,
          name: manufacturers.name,
          country: manufacturers.country,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
      .where(and(eq(products.slug, slug), eq(products.isActive, true)));

    if (!product) return null;

    // Fetch images and resolve through storage driver
    const storage = getStorageDriver();
    const rawImages = await db
      .select({
        id: productImages.id,
        basePath: productImages.basePath,
        blurhash: productImages.blurhash,
        altEn: productImages.altEn,
        altBn: productImages.altBn,
        sort: productImages.sort,
      })
      .from(productImages)
      .where(eq(productImages.productId, product.id))
      .orderBy(asc(productImages.sort));

    const images = rawImages.map((img) => ({
      id: img.id,
      url: storage.url(img.basePath, 'detail'),
      blurhash: img.blurhash,
      altEn: img.altEn,
      altBn: img.altBn,
      sort: img.sort,
    }));

    const imageUrl = images[0]?.url || '/images/cal-d-mag.jpg';

    // Fetch stock summary (derived from ledger)
    const stockSummary = await getProductStockSummary(product.id);

    return {
      ...product,
      imageUrl,
      images,
      stock: stockSummary.sellableStock,
      isOutOfStock: stockSummary.sellableStock <= 0,
    };
  } catch (err) {
    console.warn('[getProductBySlug] DB connection error, returning null fallback:', err);
    return null;
  }
}

/**
 * List products with filters and search support.
 */
export async function listProducts(opts: ProductFilterOptions = {}) {
  if (isDemoMode()) {
    return [];
  }
  try {
    const conditions = [eq(products.isActive, true)];

    if (opts.species) {
      conditions.push(arrayOverlaps(products.targetSpecies, [opts.species]));
    }

    if (opts.manufacturerId) {
      conditions.push(eq(products.manufacturerId, opts.manufacturerId));
    }

    if (opts.genericName) {
      conditions.push(ilike(products.genericName, `%${opts.genericName}%`));
    }

    if (opts.search) {
      const s = `%${opts.search.trim()}%`;
      conditions.push(
        or(
          ilike(products.nameEn, s),
          ilike(products.nameBn, s),
          ilike(products.genericName, s),
          ilike(products.banglishKeywords, s)
        )!
      );
    }

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
        withdrawalMeatDays: products.withdrawalMeatDays,
        withdrawalMilkHours: products.withdrawalMilkHours,
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
      .where(and(...conditions))
      .limit(opts.limit ?? 24)
      .offset(opts.offset ?? 0);

    const storage = getStorageDriver();

    // Attach resolved Cloudinary image for each product
    const items = await Promise.all(
      rows.map(async (row) => {
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
          imageUrl,
        };
      })
    );

    return items;
  } catch (err) {
    console.warn('[listProducts] DB connection error, returning empty list:', err);
    return [];
  }
}


// ---------------------------------------------------------------------------
// Write path (§2 rule 1 — business logic lives here, never in a route handler)
// ---------------------------------------------------------------------------

/** Thrown when an update or delete targets a product that does not exist. */
export class ProductNotFoundError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND';
  constructor(idOrSlug: string) {
    super(`No product found for "${idOrSlug}"`);
    this.name = 'ProductNotFoundError';
  }
}

/** Thrown when a write is attempted while the app is running without a database. */
export class DemoModeWriteError extends Error {
  readonly code = 'DEMO_MODE_READ_ONLY';
  constructor() {
    super('The catalog is read-only in demo mode. Set DEMO_MODE=false and configure DATABASE_URL to write products.');
    this.name = 'DemoModeWriteError';
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function productLookup(idOrSlug: string) {
  return UUID_RE.test(idOrSlug) ? eq(products.id, idOrSlug) : eq(products.slug, idOrSlug);
}

/**
 * Create a product together with its first batch and the opening stock-ledger
 * movement, in ONE transaction.
 *
 * Atomicity matters here beyond the usual reasons: §2 rule 4 forbids selling a
 * SKU without a batch, and §2 rule 3 derives stock from the ledger. A partial
 * write would leave a product that is visible in the catalog but unsellable and
 * invisible to the stock report.
 */
export async function createProduct(rawInput: unknown) {
  if (isDemoMode()) throw new DemoModeWriteError();

  const input = productCreateSchema.parse(rawInput);
  const productRow = buildProductRow(input);

  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(products)
      .values(productRow)
      .returning({ id: products.id, slug: products.slug, sku: products.sku });

    if (!inserted) throw new Error('Product insert returned no row');

    if (input.imageKey) {
      await tx.insert(productImages).values({
        productId: inserted.id,
        basePath: input.imageKey, // storage key only, never a CDN URL (§4.2)
        altEn: input.nameEn,
        altBn: input.nameBn,
      });
    }

    const batchRow = buildBatchRow(input, inserted.id);
    if (batchRow) {
      const [batch] = await tx
        .insert(productBatches)
        .values(batchRow)
        .returning({ id: productBatches.id, batchNo: productBatches.batchNo });

      // Opening stock is a ledger row, never a column (§2 rule 3).
      if (batch && batchRow.qtyReceived > 0) {
        await tx.insert(stockLedger).values({
          productId: inserted.id,
          batchId: batch.id,
          delta: batchRow.qtyReceived,
          reason: 'purchase',
          refType: 'admin_initial',
          refId: batch.batchNo,
        });
      }
    }

    return inserted;
  });
}

/**
 * Update a product's editable fields, and replace its primary image when a new
 * storage key is supplied. Throws ProductNotFoundError rather than reporting a
 * silent success for a row that is not there.
 */
export async function updateProduct(idOrSlug: string, rawInput: unknown) {
  if (isDemoMode()) throw new DemoModeWriteError();

  const input = productUpdateSchema.parse(rawInput);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(productLookup(idOrSlug))
      .limit(1);

    if (!existing) throw new ProductNotFoundError(idOrSlug);

    // Only assign keys the caller actually sent, so a partial update cannot
    // blank out fields it never mentioned.
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    const assign = <K extends keyof typeof input>(key: K, column: string) => {
      if (input[key] !== undefined) patch[column] = input[key];
    };

    assign('nameEn', 'nameEn');
    assign('nameBn', 'nameBn');
    assign('genericName', 'genericName');
    assign('productType', 'productType');
    assign('strength', 'strength');
    assign('dosageForm', 'dosageForm');
    assign('packSize', 'packSize');
    assign('packUnit', 'packUnit');
    assign('targetSpecies', 'targetSpecies');
    assign('withdrawalMeatDays', 'withdrawalMeatDays');
    assign('withdrawalMilkHours', 'withdrawalMilkHours');
    assign('storageCondition', 'storageCondition');
    assign('requiresColdChain', 'requiresColdChain');
    assign('requiresPrescription', 'requiresPrescription');
    assign('isAntimicrobial', 'isAntimicrobial');
    assign('mrp', 'mrp');
    assign('salePrice', 'salePrice');
    if (input.dgdaRegNo !== undefined) patch.dgdaRegistrationNo = input.dgdaRegNo;

    await tx.update(products).set(patch).where(eq(products.id, existing.id));

    if (input.imageKey) {
      const [existingImg] = await tx
        .select({ id: productImages.id })
        .from(productImages)
        .where(eq(productImages.productId, existing.id))
        .orderBy(asc(productImages.sort))
        .limit(1);

      if (existingImg) {
        await tx
          .update(productImages)
          .set({ basePath: input.imageKey })
          .where(eq(productImages.id, existingImg.id));
      } else {
        await tx.insert(productImages).values({
          productId: existing.id,
          basePath: input.imageKey,
          altEn: input.nameEn ?? '',
          altBn: input.nameBn ?? '',
        });
      }
    }

    return { id: existing.id, slug: existing.slug };
  });
}

/**
 * Delete a product and every image it owns from storage.
 *
 * Returns the storage keys that were removed so the caller can report them.
 * Batches, ledger rows and images cascade in Postgres (see catalog schema).
 */
export async function deleteProduct(idOrSlug: string) {
  if (isDemoMode()) throw new DemoModeWriteError();

  const [product] = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(productLookup(idOrSlug))
    .limit(1);

  if (!product) throw new ProductNotFoundError(idOrSlug);

  const images = await db
    .select({ basePath: productImages.basePath })
    .from(productImages)
    .where(eq(productImages.productId, product.id));

  await db.delete(products).where(eq(products.id, product.id));

  // Storage cleanup happens after the row is gone. A failure here leaves an
  // orphaned file, which is recoverable; failing the whole delete because a CDN
  // object was already missing is not.
  const storage = getStorageDriver();
  const deletedKeys: string[] = [];
  for (const img of images) {
    if (!img.basePath) continue;
    try {
      await storage.delete(img.basePath);
      deletedKeys.push(img.basePath);
    } catch (err) {
      console.warn(`[deleteProduct] Orphaned storage object ${img.basePath}:`, err);
    }
  }

  return { id: product.id, slug: product.slug, deletedKeys };
}
