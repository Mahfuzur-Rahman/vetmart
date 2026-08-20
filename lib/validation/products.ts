// lib/validation/products.ts
// Shared client + server validation for admin product writes (§9, §15.3.3).
// This is the single place the CLAUDE.md §2 catalog invariants are enforced, so
// the web form, the JSON API and the future Flutter client cannot diverge.
import { z } from 'zod';
import { normalizeDigits } from '@/lib/i18n/number';

/**
 * Product types that cannot be sold without a batch and expiry date (§2 rule 4,
 * §5.1). Instruments and accessories are the only exceptions.
 */
export const BATCH_REQUIRED_PRODUCT_TYPES = new Set([
  'drug_otc',
  'drug_rx',
  'vaccine',
  'feed_supplement',
  'disinfectant',
  'pet_food',
]);

export const PRODUCT_TYPES = [
  'drug_otc',
  'drug_rx',
  'vaccine',
  'feed_supplement',
  'instrument',
  'disinfectant',
  'pet_food',
  'accessory',
] as const;

export const STORAGE_CONDITIONS = ['room_temp', 'cool_dry', '2_8_celsius', 'frozen'] as const;

/**
 * Accepts Bengali (০-৯) and Arabic-Indic (٠-٩) digits as well as ASCII, because
 * mobile clients and copy-paste bypass any normalization the form does (§20).
 */
const integerFromAnyScript = (fieldLabel: string) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const normalized = normalizeDigits(v).replace(/[^0-9.-]/g, '');
      if (normalized === '') return undefined;
      const parsed = Number(normalized);
      return Number.isNaN(parsed) ? v : parsed;
    }
    return v;
  }, z.number({ invalid_type_error: `${fieldLabel} must be a number` }).int(`${fieldLabel} must be a whole number of paisa`).nonnegative(`${fieldLabel} cannot be negative`));

/** A date the operator typed, in any digit script. */
const dateFromAnyScript = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return undefined;
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const parsed = new Date(normalizeDigits(v));
    return Number.isNaN(parsed.getTime()) ? v : parsed;
  }
  return v;
}, z.date({ invalid_type_error: 'Expected a valid date' }));

/**
 * Storage keys only — never a full CDN URL (§4.2 rule 1, §20). A
 * res.cloudinary.com URL in the database turns the eventual media migration
 * into a data-repair project.
 */
const storageKey = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !/^https?:\/\//i.test(v), {
    message:
      'imageKey must be a storage key such as "vetmart/products/abc123", not a full URL. ' +
      'Storing a CDN URL breaks the local-media migration.',
  });

export const productCreateSchema = z
  .object({
    slug: z.string().trim().toLowerCase().optional(),
    sku: z.string().trim().optional(),

    nameEn: z.string().trim().min(1, 'English name is required'),
    // §2 rule 7: a missing Bangla string is a failure, never a silent English fallback.
    nameBn: z.string().trim().min(1, 'Bangla name is required (nameBn)'),
    genericName: z.string().trim().optional().default(''),

    productType: z.enum(PRODUCT_TYPES).default('drug_otc'),
    categorySlug: z.string().trim().optional(),
    drugClassificationSlug: z.string().trim().optional(),
    manufacturerName: z.string().trim().optional(),

    strength: z.string().trim().optional().default(''),
    strengthUnit: z.string().trim().optional().default(''),
    dosageForm: z.string().trim().optional().default(''),
    packSize: z.string().trim().optional().default(''),
    packUnit: z.string().trim().optional().default(''),
    targetSpecies: z.array(z.string().trim()).default([]),

    withdrawalMeatDays: integerFromAnyScript('Meat withdrawal period').optional().default(0),
    withdrawalMilkHours: integerFromAnyScript('Milk withdrawal period').optional().default(0),

    dgdaRegNo: z.string().trim().optional().default(''),
    storageCondition: z.enum(STORAGE_CONDITIONS).default('room_temp'),
    requiresColdChain: z.coerce.boolean().default(false),
    requiresPrescription: z.coerce.boolean().default(false),
    isAntimicrobial: z.coerce.boolean().default(false),

    // Money is integer paisa end to end (§2 rule 5).
    mrp: integerFromAnyScript('MRP'),
    salePrice: integerFromAnyScript('Sale price'),

    batchNo: z.string().trim().optional(),
    mfgDate: dateFromAnyScript.optional(),
    expiryDate: dateFromAnyScript.optional(),
    stockQty: integerFromAnyScript('Stock quantity').optional().default(0),

    imageKey: storageKey.optional(),
    banglishKeywords: z.string().trim().optional(),
    descriptionEn: z.string().trim().optional(),
    descriptionBn: z.string().trim().optional(),
    dosageEn: z.string().trim().optional(),
    dosageBn: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const needsBatch = BATCH_REQUIRED_PRODUCT_TYPES.has(data.productType);

    if (needsBatch && !data.batchNo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A batch number is mandatory for ${data.productType} (§2 rule 4). No batch = cannot be sold.`,
        path: ['batchNo'],
      });
    }

    if (needsBatch && !data.expiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `An expiry date is mandatory for ${data.productType} (§2 rule 4). No expiry = cannot be sold.`,
        path: ['expiryDate'],
      });
    }

    if (data.expiryDate && data.expiryDate.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expiry date is already in the past; this stock cannot be sold.',
        path: ['expiryDate'],
      });
    }

    if (data.mfgDate && data.expiryDate && data.mfgDate >= data.expiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Manufacturing date must be earlier than the expiry date.',
        path: ['mfgDate'],
      });
    }

    if (data.salePrice > data.mrp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sale price cannot exceed MRP.',
        path: ['salePrice'],
      });
    }
  });

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

/** Update accepts the same fields, all optional, without the batch requirement. */
export const productUpdateSchema = productCreateSchema
  .innerType()
  .partial()
  .extend({
    imageKey: storageKey.optional(),
  });

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

/** URL-safe slug derived from the English product name. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Map validated input onto the `products` table shape.
 *
 * Kept pure and separate from the database call so the catalog invariants are
 * unit-testable without a Postgres connection.
 */
export function buildProductRow(input: ProductCreateInput) {
  const slug = input.slug?.trim() || slugify(input.nameEn) || `product-${Date.now()}`;
  const sku = input.sku?.trim() || `VET-${slugify(input.nameEn).slice(0, 12).toUpperCase() || 'SKU'}-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    slug,
    sku,
    nameEn: input.nameEn,
    nameBn: input.nameBn,
    genericName: input.genericName || '',
    productType: input.productType,
    strength: input.strength || '',
    strengthUnit: input.strengthUnit || '',
    dosageForm: input.dosageForm || '',
    packSize: input.packSize || '',
    packUnit: input.packUnit || '',
    targetSpecies: input.targetSpecies,
    withdrawalMeatDays: input.withdrawalMeatDays,
    withdrawalMilkHours: input.withdrawalMilkHours,
    dgdaRegistrationNo: input.dgdaRegNo || '',
    storageCondition: input.storageCondition,
    requiresColdChain: input.requiresColdChain,
    requiresPrescription: input.requiresPrescription,
    isAntimicrobial: input.isAntimicrobial,
    vatRate: '0.00',
    mrp: input.mrp,
    salePrice: input.salePrice,
    // Latin-script keywords matter because a large share of BD users type
    // "gorur oshudh" rather than Bangla script (§20).
    banglishKeywords:
      input.banglishKeywords?.toLowerCase() ||
      `${input.nameEn} ${input.genericName}`.toLowerCase().trim(),
    isActive: true,
  };
}

/**
 * Map validated input onto the `product_batches` table shape, or null when the
 * product type does not carry a batch (§5.1).
 */
export function buildBatchRow(input: ProductCreateInput, productId: string) {
  if (!BATCH_REQUIRED_PRODUCT_TYPES.has(input.productType)) return null;

  const expiryDate = input.expiryDate!;
  const mfgDate = input.mfgDate ?? new Date();

  return {
    productId,
    batchNo: input.batchNo!,
    mfgDate,
    expiryDate,
    qtyReceived: input.stockQty,
    // Cost price is unknown at catalog-entry time; assume a 25% margin until a
    // purchase entry supplies the real figure. Integer paisa (§2 rule 5).
    costPrice: Math.round(input.salePrice * 0.75),
    supplierId: input.manufacturerName || 'Primary Distributor',
  };
}
