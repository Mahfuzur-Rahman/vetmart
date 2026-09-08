// tests/product-lifecycle.test.ts
// Guards the product delete / activate / deactivate / homepage-visibility path.
//
// Each case below corresponds to a bug that made the admin products screen and
// the homepage rail disagree with the database.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  pickFeatured,
  FEATURED_LIMIT,
  FEATURED_FETCH_SIZE,
  FEATURED_QUERY,
} from '@/lib/catalog/featured';

const ROOT = path.resolve(__dirname, '..');
const readSource = (relPath: string) => fs.readFileSync(path.join(ROOT, relPath), 'utf-8');

describe('homepage featured rail (§16.1)', () => {
  it('fetches wider than the rail so out-of-stock rows can be demoted', () => {
    expect(FEATURED_FETCH_SIZE).toBeGreaterThan(FEATURED_LIMIT);
  });

  it('asks for newest-first, not the default alphabetical order', () => {
    // ORDER BY name_en ASC meant no operator action could ever put a new
    // product on the home page.
    expect(FEATURED_QUERY).toContain('sort=newest');
    expect(FEATURED_QUERY).toContain(`pageSize=${FEATURED_FETCH_SIZE}`);
  });

  it('puts sellable products ahead of empty ones while preserving input order', () => {
    const items = [
      { id: 'a', sellableStock: 0 },
      { id: 'b', sellableStock: 12 },
      { id: 'c', sellableStock: 0 },
      { id: 'd', sellableStock: 3 },
    ];
    expect(pickFeatured(items).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('still fills the rail from out-of-stock rows rather than leaving gaps', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, sellableStock: 0 }));
    expect(pickFeatured(items)).toHaveLength(5);
  });

  it('falls back to stockQty when sellableStock is absent', () => {
    const items = [
      { id: 'empty', stockQty: 0 },
      { id: 'stocked', stockQty: 4 },
    ];
    expect(pickFeatured(items)[0].id).toBe('stocked');
  });

  it('never returns more than the rail can render', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, sellableStock: 1 }));
    expect(pickFeatured(items)).toHaveLength(FEATURED_LIMIT);
  });

  it('handles an empty catalog without throwing', () => {
    expect(pickFeatured([])).toEqual([]);
  });
});

describe('catalog page-size limits', () => {
  const src = readSource('lib/services/search.ts');

  it('lets an admin request more than the old 48-row cap', () => {
    // A row the admin table never rendered could not be edited, deactivated or
    // deleted — which is what made those actions look broken.
    const match = src.match(/export const MAX_PAGE_SIZE = (\d+);/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(48);
  });

  it('still caps anonymous storefront callers', () => {
    expect(src).toContain('export const PUBLIC_MAX_PAGE_SIZE = 48;');
  });

  it('applies the public cap only when inactive rows are not requested', () => {
    const route = readSource('app/api/v1/products/route.ts');
    expect(route).toContain('includeInactive ? MAX_PAGE_SIZE : PUBLIC_MAX_PAGE_SIZE');
  });

  it('pages the admin table instead of trusting a single oversized request', () => {
    const table = readSource('components/admin/AdminProductsTable.tsx');
    expect(table).not.toContain('pageSize=100');
    expect(table).toMatch(/meta\?\.totalPages/);
  });
});

describe('catalog rows expose the slugs the admin form writes back', () => {
  const src = readSource('lib/services/search.ts');

  it('selects categorySlug and drugClassificationSlug', () => {
    // Without these the edit modal read `undefined` and fell through to its
    // hardcoded defaults, silently reassigning the product's category and
    // pharmacological classification on every save.
    expect(src).toContain('categorySlug: categories.slug');
    expect(src).toContain('drugClassificationSlug: drugClassifications.slug');
    expect(src).toContain('leftJoin(drugClassifications');
  });

  it('no longer lets the edit modal invent a category or classification', () => {
    const table = readSource('components/admin/AdminProductsTable.tsx');
    expect(table).not.toContain("prod.categorySlug || 'vitamins-minerals'");
    expect(table).not.toContain("prod.drugClassificationSlug || 'vitamins'");
  });
});

describe('editing a product preserves what the form does not control', () => {
  const table = readSource('components/admin/AdminProductsTable.tsx');

  it('does not clear the prescription requirement on save (§17)', () => {
    expect(table).toContain('requiresPrescription: requiresRx');
    expect(table).toContain('setRequiresRx(prod.requiresPrescription === true)');
    expect(table).not.toContain('requiresPrescription: false,\n          hasShippingCharge');
  });

  it('only sends stockQty when the operator changed it (§2 rule 3)', () => {
    // updateProduct writes a stock_ledger adjustment for any stockQty it
    // receives, so resending the unchanged sellable figure logged a phantom
    // movement whenever a batch sat inside the 60-day expiry window.
    expect(table).toContain('const stockChanged =');
    expect(table).toContain('delete editPayload.stockQty');
  });

  it('does not invent a batch number, expiry or pack size (§2 rule 4)', () => {
    expect(table).not.toContain("prod.batchNo || 'B-BATCH-001'");
    expect(table).not.toContain("'2027-12-31'");
    expect(table).not.toContain("prod.packSize || '1 Litre'");
  });

  it('seeds new products with a species key the browse pages recognise', () => {
    expect(table).not.toContain("'goat-sheep'");
    expect(table).toContain("'goat_sheep'");
  });
});

describe('product deletion', () => {
  const src = readSource('lib/services/products.ts');

  it('refuses a product that order history references', () => {
    expect(src).toContain('export class ProductInUseError');
    expect(src).toContain('.from(orderItems)');
  });

  it('maps that refusal onto a 409, not a 500', () => {
    const route = readSource('app/api/v1/admin/products/[id]/route.ts');
    expect(route).toContain('err instanceof ProductInUseError');
    expect(route).toContain('409');
  });

  it('deletes stored images only after the transaction commits', () => {
    // Storage is not transactional. Deleting blobs inside the transaction meant
    // a rejected delete rolled the row back while its images were already gone.
    const txStart = src.indexOf('const basePaths = await db.transaction');
    const txEnd = src.indexOf('const storage = getStorageDriver();', txStart);
    expect(txStart).toBeGreaterThan(-1);
    expect(txEnd).toBeGreaterThan(txStart);

    const insideTransaction = src.slice(txStart, txEnd);
    expect(insideTransaction).not.toContain('storage.delete');
    expect(src.slice(txEnd)).toContain('await storage.delete(basePath)');
  });

  it('reports success even if orphaned blob cleanup fails', () => {
    expect(src).toContain('deleted but image');
  });

  it('re-reads the list from the server after a delete', () => {
    const table = readSource('components/admin/AdminProductsTable.tsx');
    expect(table).not.toContain(
      'setProducts((prev) => prev.filter((p) => p.id !== deleteConfirmProduct.id))'
    );
    expect(table).toContain('if (res.status !== 409) setDeleteConfirmProduct(null);');
  });
});

describe('storefront refetches keep their filters', () => {
  it('does not refetch the unfiltered catalog and re-filter client-side', () => {
    const src = readSource('components/storefront/ProductsCatalogView.tsx');
    expect(src).not.toContain("fetch('/api/v1/products?pageSize=48')");
    expect(src).toContain("params.set('category', categoryFilter)");
    expect(src).toContain("params.set('species', speciesFilter)");
  });
});
