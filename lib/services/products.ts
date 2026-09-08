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
  drugClassifications,
  orderItems,
} from '@/lib/db/schema';
import { getStorageDriver } from '@/lib/storage';
import { getProductStockSummary } from './stock';
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
  // No try/catch: a database failure must propagate. Returning null here made a
  // dead connection indistinguishable from a deleted product.
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
      hasShippingCharge: products.hasShippingCharge,
      shippingInsideDhaka: products.shippingInsideDhaka,
      shippingOutsideDhaka: products.shippingOutsideDhaka,
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
}

/**
 * List products with filters and search support.
 */
export async function listProducts(opts: ProductFilterOptions = {}) {
  // No try/catch: a database failure must propagate rather than render an
  // empty catalog that looks like a shop with no stock.
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
      packUnit: products.packUnit,
      targetSpecies: products.targetSpecies,
      withdrawalMeatDays: products.withdrawalMeatDays,
      withdrawalMilkHours: products.withdrawalMilkHours,
      requiresPrescription: products.requiresPrescription,
      requiresColdChain: products.requiresColdChain,
      mrp: products.mrp,
      salePrice: products.salePrice,
      hasShippingCharge: products.hasShippingCharge,
      shippingInsideDhaka: products.shippingInsideDhaka,
      shippingOutsideDhaka: products.shippingOutsideDhaka,
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

/**
 * Thrown when a delete is refused because order history depends on the row.
 * Order lines must stay reconstructible years later (§6, "snapshot everything
 * on the order"), so the product is deactivated instead of removed.
 */
export class ProductInUseError extends Error {
  readonly code = 'PRODUCT_IN_USE';
  constructor(readonly orderLineCount: number) {
    super(
      `This product appears on ${orderLineCount} order line(s) and cannot be deleted. ` +
        'Deactivate it instead so order history stays intact.'
    );
    this.name = 'ProductInUseError';
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function productLookup(idOrSlug: string) {
  return UUID_RE.test(idOrSlug)
    ? or(eq(products.id, idOrSlug), eq(products.slug, idOrSlug))
    : or(eq(products.slug, idOrSlug), eq(products.sku, idOrSlug));
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
  const input = productCreateSchema.parse(rawInput);
  const productRow = buildProductRow(input);

  return db.transaction(async (tx) => {
    let categoryId: string | null = null;
    if (input.categorySlug) {
      const [cat] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, input.categorySlug))
        .limit(1);
      if (cat) categoryId = cat.id;
    }

    let drugClassificationId: string | null = null;
    if (input.drugClassificationSlug) {
      const [dc] = await tx
        .select({ id: drugClassifications.id })
        .from(drugClassifications)
        .where(eq(drugClassifications.slug, input.drugClassificationSlug))
        .limit(1);
      if (dc) drugClassificationId = dc.id;
    }

    let manufacturerId: string | null = null;
    if (input.manufacturerName) {
      const [mfg] = await tx
        .select({ id: manufacturers.id })
        .from(manufacturers)
        .where(eq(manufacturers.name, input.manufacturerName))
        .limit(1);
      if (mfg) {
        manufacturerId = mfg.id;
      } else {
        const [newMfg] = await tx
          .insert(manufacturers)
          .values({ name: input.manufacturerName })
          .returning({ id: manufacturers.id });
        if (newMfg) manufacturerId = newMfg.id;
      }
    }

    const [inserted] = await tx
      .insert(products)
      .values({
        ...productRow,
        categoryId,
        drugClassificationId,
        manufacturerId,
      })
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
  const input = productUpdateSchema.parse(rawInput);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        id: products.id,
        slug: products.slug,
        nameEn: products.nameEn,
        genericName: products.genericName,
      })
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
    assign('hasShippingCharge', 'hasShippingCharge');
    assign('shippingInsideDhaka', 'shippingInsideDhaka');
    assign('shippingOutsideDhaka', 'shippingOutsideDhaka');
    assign('isActive', 'isActive');
    if (input.dgdaRegNo !== undefined) patch.dgdaRegistrationNo = input.dgdaRegNo;

    // Resolve Category ID from slug if supplied
    if (input.categorySlug) {
      const [cat] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, input.categorySlug))
        .limit(1);
      if (cat) patch.categoryId = cat.id;
    }

    // Resolve Drug Classification ID from slug if supplied
    if (input.drugClassificationSlug) {
      const [dc] = await tx
        .select({ id: drugClassifications.id })
        .from(drugClassifications)
        .where(eq(drugClassifications.slug, input.drugClassificationSlug))
        .limit(1);
      if (dc) patch.drugClassificationId = dc.id;
    }

    // Resolve or upsert Manufacturer ID from name if supplied
    if (input.manufacturerName) {
      const [mfg] = await tx
        .select({ id: manufacturers.id })
        .from(manufacturers)
        .where(eq(manufacturers.name, input.manufacturerName))
        .limit(1);
      if (mfg) {
        patch.manufacturerId = mfg.id;
      } else {
        const [newMfg] = await tx
          .insert(manufacturers)
          .values({ name: input.manufacturerName })
          .returning({ id: manufacturers.id });
        if (newMfg) patch.manufacturerId = newMfg.id;
      }
    }

    // Update Banglish keywords if name or generic name changed
    if (input.banglishKeywords !== undefined) {
      patch.banglishKeywords = input.banglishKeywords.toLowerCase().trim();
    } else if (input.nameEn !== undefined || input.genericName !== undefined) {
      const nEn = input.nameEn ?? existing.nameEn;
      const gN = input.genericName ?? existing.genericName ?? '';
      patch.banglishKeywords = `${nEn} ${gN}`.toLowerCase().trim();
    }

    await tx.update(products).set(patch).where(eq(products.id, existing.id));

    // Update image if a new imageKey is supplied
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
          altEn: input.nameEn ?? existing.nameEn,
          altBn: input.nameBn ?? existing.nameEn,
        });
      }
    }

    // Update batch info and stock if provided
    if (input.batchNo || input.expiryDate || input.mfgDate || input.stockQty !== undefined) {
      const [existingBatch] = await tx
        .select({ id: productBatches.id, batchNo: productBatches.batchNo })
        .from(productBatches)
        .where(eq(productBatches.productId, existing.id))
        .limit(1);

      if (existingBatch) {
        const batchPatch: Record<string, unknown> = {};
        if (input.batchNo) batchPatch.batchNo = input.batchNo;
        if (input.expiryDate) batchPatch.expiryDate = input.expiryDate;
        if (input.mfgDate) batchPatch.mfgDate = input.mfgDate;
        if (Object.keys(batchPatch).length > 0) {
          await tx.update(productBatches).set(batchPatch).where(eq(productBatches.id, existingBatch.id));
        }

        // Adjust stock in the immutable ledger if stockQty was specified
        if (input.stockQty !== undefined) {
          const [stockRow] = await tx
            .select({
              total: dSql<number>`coalesce(sum(${stockLedger.delta}), 0)::int`,
            })
            .from(stockLedger)
            .where(eq(stockLedger.batchId, existingBatch.id));

          const currentStock = stockRow?.total ?? 0;
          const delta = input.stockQty - currentStock;
          if (delta !== 0) {
            await tx.insert(stockLedger).values({
              productId: existing.id,
              batchId: existingBatch.id,
              delta,
              reason: 'adjust',
              refType: 'admin_update',
              refId: input.batchNo || existingBatch.batchNo || existingBatch.id,
            });
          }
        }
      } else if (input.batchNo || input.stockQty !== undefined) {
        const batchNo = input.batchNo || `BAT-${Date.now().toString().slice(-6)}`;
        const expiryDate = input.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        const [newBatch] = await tx
          .insert(productBatches)
          .values({
            productId: existing.id,
            batchNo,
            expiryDate,
            mfgDate: input.mfgDate ?? new Date(),
            qtyReceived: input.stockQty ?? 0,
            costPrice: Math.round((input.salePrice ?? 0) * 0.75),
            supplierId: input.manufacturerName || 'Primary Distributor',
          })
          .returning({ id: productBatches.id });

        if (newBatch && (input.stockQty ?? 0) > 0) {
          await tx.insert(stockLedger).values({
            productId: existing.id,
            batchId: newBatch.id,
            delta: input.stockQty!,
            reason: 'adjust',
            refType: 'admin_initial',
            refId: batchNo,
          });
        }
      }
    }

    return { id: existing.id, slug: existing.slug };
  });
}



/**
 * Permanently delete a product together with its images, batches and ledger
 * rows (all cascading from `products`).
 *
 * Two ordering rules matter here:
 *
 * 1. **Refuse up front if order history references the product.** `order_items`
 *    points at both `products` and `product_batches` without a cascade, so the
 *    delete would fail deep inside the statement with a raw 23503 naming
 *    whichever constraint tripped first. Checking first produces an accurate
 *    message and leaves nothing half-done.
 * 2. **Delete the stored images only after the transaction has committed.**
 *    Storage is not transactional. Removing blobs inside the transaction meant a
 *    rejected delete rolled the database back while the product's images were
 *    already gone from Cloudinary/disk — the product survived with no artwork
 *    and no way to recover it.
 */
export async function deleteProduct(id: string) {
  const basePaths = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new ProductNotFoundError(id);
    }

    const [used] = await tx
      .select({ count: dSql<number>`count(*)::int` })
      .from(orderItems)
      .where(eq(orderItems.productId, id));

    if ((used?.count ?? 0) > 0) {
      throw new ProductInUseError(used!.count);
    }

    const images = await tx
      .select({ basePath: productImages.basePath })
      .from(productImages)
      .where(eq(productImages.productId, id));

    // productImages, productBatches, stockLedger and productReviews all declare
    // onDelete: 'cascade', so this one statement clears them too.
    await tx.delete(products).where(eq(products.id, id));

    return images.map((img) => img.basePath).filter((p): p is string => !!p);
  });

  // Past the commit point: the row is gone for good, so orphaned blobs are the
  // only thing left to clean up. A storage failure is logged, never thrown — it
  // must not report a successful delete as a failure.
  const storage = getStorageDriver();
  for (const basePath of basePaths) {
    try {
      await storage.delete(basePath);
    } catch (err) {
      console.error(`[deleteProduct] Product ${id} deleted but image "${basePath}" could not be removed from storage:`, err);
    }
  }

  return { success: true, deletedId: id };
}
