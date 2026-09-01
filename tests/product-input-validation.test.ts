// tests/product-input-validation.test.ts
// The admin product form is the only way regulated SKUs enter the catalog, so
// the invariants in CLAUDE.md §2 are enforced here rather than in the route.
import { describe, it, expect } from 'vitest';
import {
  productCreateSchema,
  productUpdateSchema,
  buildProductRow,
  buildBatchRow,
  BATCH_REQUIRED_PRODUCT_TYPES,
} from '@/lib/validation/products';

/** Smallest payload that should be accepted for a batch-tracked drug. */
function validDrugInput(overrides: Record<string, unknown> = {}) {
  return {
    nameEn: 'Renaflox 100ml Injection',
    nameBn: 'রেনাফ্লক্স ১০০ মি.লি. ইনজেকশন',
    genericName: 'Enrofloxacin',
    productType: 'drug_otc',
    mrp: 52000,
    salePrice: 47500,
    batchNo: 'B-BEX-9042',
    mfgDate: '2025-10-01',
    expiryDate: '2027-10-31',
    stockQty: 60,
    targetSpecies: ['cattle'],
    ...overrides,
  };
}

describe('productCreateSchema', () => {
  it('accepts a minimal valid drug payload', () => {
    const result = productCreateSchema.safeParse(validDrugInput());
    expect(result.success).toBe(true);
  });

  it('normalizes Bengali digits in numeric fields (§15.3.3)', () => {
    // A farmer or operator on a Bangla keyboard types ৫২০০০, and mobile clients
    // bypass the form's own normalization entirely.
    const result = productCreateSchema.safeParse(
      validDrugInput({ mrp: '৫২০০০', salePrice: '৪৭৫০০', stockQty: '৬০' })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mrp).toBe(52000);
      expect(result.data.salePrice).toBe(47500);
      expect(result.data.stockQty).toBe(60);
    }
  });

  it('rejects a missing Bangla name (§2 rule 7)', () => {
    const result = productCreateSchema.safeParse(validDrugInput({ nameBn: '' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'nameBn')).toBe(true);
    }
  });

  it('rejects a drug SKU with no expiry date (§2 rule 4)', () => {
    const result = productCreateSchema.safeParse(validDrugInput({ expiryDate: undefined }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'expiryDate')).toBe(true);
    }
  });

  it('rejects a drug SKU with no batch number (§2 rule 4)', () => {
    const result = productCreateSchema.safeParse(validDrugInput({ batchNo: '' }));
    expect(result.success).toBe(false);
  });

  it('allows an instrument with no batch or expiry (§5.1)', () => {
    const result = productCreateSchema.safeParse({
      nameEn: 'Stainless AI Gun',
      nameBn: 'স্টেইনলেস এআই গান',
      productType: 'instrument',
      mrp: 180000,
      salePrice: 165000,
      stockQty: 12,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an expiry date already in the past', () => {
    const result = productCreateSchema.safeParse(validDrugInput({ expiryDate: '2020-01-01' }));
    expect(result.success).toBe(false);
  });

  it('rejects a negative price', () => {
    const result = productCreateSchema.safeParse(validDrugInput({ salePrice: -100 }));
    expect(result.success).toBe(false);
  });

  it('rejects a full Cloudinary URL as the image key (§20)', () => {
    // Letting a full res.cloudinary.com URL into the DB turns the later media
    // migration from a 20-minute job into a data-repair project.
    const result = productCreateSchema.safeParse(
      validDrugInput({
        imageKey: 'https://res.cloudinary.com/demo/image/upload/v1/vetmart/products/x.jpg',
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'imageKey')).toBe(true);
    }
  });

  it('accepts a bare storage key as the image key', () => {
    const result = productCreateSchema.safeParse(
      validDrugInput({ imageKey: 'vetmart/products/prod_1755690000_ab12cd.webp' })
    );
    expect(result.success).toBe(true);
  });

  it('lists the product types that require a batch', () => {
    expect(BATCH_REQUIRED_PRODUCT_TYPES.has('drug_rx')).toBe(true);
    expect(BATCH_REQUIRED_PRODUCT_TYPES.has('vaccine')).toBe(true);
    expect(BATCH_REQUIRED_PRODUCT_TYPES.has('feed_supplement')).toBe(true);
    expect(BATCH_REQUIRED_PRODUCT_TYPES.has('instrument')).toBe(false);
    expect(BATCH_REQUIRED_PRODUCT_TYPES.has('accessory')).toBe(false);
  });
});

describe('buildProductRow()', () => {
  it('derives a slug from the English name when none is supplied', () => {
    const input = productCreateSchema.parse(validDrugInput());
    expect(buildProductRow(input).slug).toBe('renaflox-100ml-injection');
  });

  it('keeps an explicitly supplied slug', () => {
    const input = productCreateSchema.parse(validDrugInput({ slug: 'renaflox-100ml' }));
    expect(buildProductRow(input).slug).toBe('renaflox-100ml');
  });

  it('generates a SKU when none is supplied', () => {
    const input = productCreateSchema.parse(validDrugInput());
    expect(buildProductRow(input).sku).toMatch(/^VET-/);
  });

  it('stores money as integer paisa, never a float (§2 rule 5)', () => {
    const input = productCreateSchema.parse(validDrugInput({ mrp: 52000, salePrice: 47500 }));
    const row = buildProductRow(input);
    expect(Number.isInteger(row.mrp)).toBe(true);
    expect(Number.isInteger(row.salePrice)).toBe(true);
    expect(row.salePrice).toBe(47500);
  });

  it('falls back to the English name when Bangla is only whitespace is impossible', () => {
    // nameBn is required by the schema, so buildProductRow can rely on it.
    const input = productCreateSchema.parse(validDrugInput());
    expect(buildProductRow(input).nameBn).toBe('রেনাফ্লক্স ১০০ মি.লি. ইনজেকশন');
  });

  it('derives Banglish keywords for Latin-script search (§20)', () => {
    const input = productCreateSchema.parse(validDrugInput());
    expect(buildProductRow(input).banglishKeywords).toContain('enrofloxacin');
  });
});

describe('buildBatchRow()', () => {
  it('returns null for product types that do not carry a batch', () => {
    const input = productCreateSchema.parse({
      nameEn: 'Dog Collar',
      nameBn: 'কুকুরের কলার',
      productType: 'accessory',
      mrp: 45000,
      salePrice: 39000,
      stockQty: 20,
    });
    expect(buildBatchRow(input, 'prod-uuid')).toBeNull();
  });

  it('derives cost price as integer paisa below the sale price', () => {
    const input = productCreateSchema.parse(validDrugInput());
    const batch = buildBatchRow(input, 'prod-uuid');
    expect(batch).not.toBeNull();
    expect(Number.isInteger(batch!.costPrice)).toBe(true);
    expect(batch!.costPrice).toBeLessThan(input.salePrice);
  });

  it('carries the received quantity through to the batch', () => {
    const input = productCreateSchema.parse(validDrugInput({ stockQty: 60 }));
    expect(buildBatchRow(input, 'prod-uuid')!.qtyReceived).toBe(60);
  });
});

describe('productUpdateSchema & Active/Inactive Toggling', () => {
  it('accepts isActive: false to deactivate a product', () => {
    const result = productUpdateSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });

  it('accepts isActive: true to re-activate a product', () => {
    const result = productUpdateSchema.safeParse({ isActive: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it('leaves isActive undefined when not specified in update', () => {
    const result = productUpdateSchema.safeParse({ nameEn: 'Updated Product Name' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBeUndefined();
    }
  });

  it('defaults isActive to true in productCreateSchema when omitted', () => {
    const result = productCreateSchema.safeParse(validDrugInput());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      const row = buildProductRow(result.data);
      expect(row.isActive).toBe(true);
    }
  });

  it('preserves isActive: false in buildProductRow when explicitly created inactive', () => {
    const result = productCreateSchema.safeParse(validDrugInput({ isActive: false }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
      const row = buildProductRow(result.data);
      expect(row.isActive).toBe(false);
    }
  });

  it('accepts imageKey: null on productUpdateSchema when saving changes without changing image', () => {
    const result = productUpdateSchema.safeParse({
      nameEn: 'Updated Cal-D-Mag Plus',
      nameBn: 'আপডেটেড ক্যাল-ডি-ম্যাগ',
      genericName: 'Calcium + Vitamin D3',
      mrp: 55000,
      salePrice: 50000,
      imageKey: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageKey).toBeUndefined();
      expect(result.data.nameEn).toBe('Updated Cal-D-Mag Plus');
    }
  });

  it('accepts imageKey: "" on productUpdateSchema', () => {
    const result = productUpdateSchema.safeParse({
      nameEn: 'Updated Product',
      imageKey: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageKey).toBeUndefined();
    }
  });

  it('accepts imageKey: null on productCreateSchema for default image creation', () => {
    const result = productCreateSchema.safeParse(validDrugInput({ imageKey: null }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageKey).toBeUndefined();
    }
  });

  it('accepts a complete admin edit payload with strings, prices, categories, and null imageKey', () => {
    const editPayload = {
      nameEn: 'Beximco Cal-D-Mag Plus Vet Liquid 1L',
      nameBn: 'বেক্সিমকো ক্যাল-ডি-ম্যাগ প্লাস ভেট লিকুইড ১ লিটার',
      genericName: 'Calcium + Magnesium + Vitamin D3',
      categorySlug: 'vitamins-minerals',
      drugClassificationSlug: 'vitamins',
      manufacturerName: 'Beximco Pharmaceuticals Ltd',
      targetSpecies: ['cattle', 'poultry'],
      mrp: 52000,
      salePrice: 47500,
      batchNo: 'B-BEX-9042',
      expiryDate: '2027-10-31',
      mfgDate: '2025-10-01',
      dgdaRegNo: 'DAR-012-441-098',
      stockQty: 60,
      requiresPrescription: false,
      requiresColdChain: false,
      hasShippingCharge: true,
      shippingInsideDhaka: 7000,
      shippingOutsideDhaka: 13000,
      imageKey: null,
      isActive: true,
    };

    const result = productUpdateSchema.safeParse(editPayload);
    expect(result.success).toBe(true);
  });
});
