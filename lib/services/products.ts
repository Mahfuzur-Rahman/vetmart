// lib/services/products.ts
// Product catalog queries & species navigation (§2 rule 1, §5.2, §7)
import { eq, and, sql as dSql, ilike, or, arrayOverlaps, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productImages, categories, manufacturers, productBatches } from '@/lib/db/schema';
import { getStorageDriver } from '@/lib/storage';
import { getProductStockSummary } from './stock';

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

