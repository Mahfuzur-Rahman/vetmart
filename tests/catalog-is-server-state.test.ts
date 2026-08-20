// tests/catalog-is-server-state.test.ts
//
// Replaces tests/products-client-sync.test.ts, which pinned the localStorage
// catalog store. That store is the bug: because every storefront surface read
// through it, a product created on one device was visible only on that device
// and an incognito window saw nothing at all.
//
// These tests assert the store is gone and stays gone.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as productsModule from '@/lib/mock-data/products';

const ROOT = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

/** Every surface that used to merge server data with per-browser localStorage. */
const CATALOG_SURFACES = [
  'components/storefront/ProductsCatalogView.tsx',
  'components/storefront/FeaturedProductsGrid.tsx',
  'components/storefront/SpeciesProductsView.tsx',
  'components/storefront/ProductDetailView.tsx',
  'components/storefront/ExpressOrderView.tsx',
  'components/admin/AdminProductsTable.tsx',
];

describe('the browser-side catalog store is gone', () => {
  it('no longer exports the localStorage product accessors', () => {
    for (const removed of [
      'getStoredProducts',
      'getStoredProductBySlug',
      'saveStoredCustomProduct',
      'deleteStoredProduct',
      'clearAllStoredProducts',
      'isProductDeleted',
    ]) {
      expect(productsModule).not.toHaveProperty(removed);
    }
  });

  it('no longer exports the localStorage keys it wrote to', () => {
    expect(productsModule).not.toHaveProperty('STORAGE_KEY');
    expect(productsModule).not.toHaveProperty('DELETED_KEY');
  });

  it('keeps PRODUCTS_UPDATED_EVENT for post-write refresh nudges', () => {
    expect(productsModule.PRODUCTS_UPDATED_EVENT).toBe('vetmart_products_updated');
  });

  it.each(CATALOG_SURFACES)('%s does not touch localStorage for the catalog', (relPath) => {
    const src = readSource(relPath);
    expect(src).not.toContain('vetmart_custom_products');
    expect(src).not.toContain('vetmart_deleted_product_ids');
    expect(src).not.toContain('getStoredProducts');
    expect(src).not.toContain('saveStoredCustomProduct');
  });
});

describe('demo mode serves the seed catalog', () => {
  it('MOCK_PRODUCTS is the seed catalog, not an empty array', () => {
    // An empty MOCK_PRODUCTS meant a demo deploy rendered an empty storefront,
    // which pushed every client into its localStorage fallback.
    expect(productsModule.MOCK_PRODUCTS.length).toBeGreaterThan(0);
    expect(productsModule.MOCK_PRODUCTS).toBe(productsModule.SEED_PRODUCTS);
  });

  it('every seed product carries the fields a vet SKU needs (§5.2)', () => {
    for (const p of productsModule.SEED_PRODUCTS) {
      expect(p.nameBn, `${p.slug} is missing nameBn`).toBeTruthy();
      expect(p.genericName, `${p.slug} is missing genericName`).toBeTruthy();
      expect(p.dgdaRegNo, `${p.slug} is missing dgdaRegNo`).toBeTruthy();
      expect(p.batchNo, `${p.slug} is missing batchNo`).toBeTruthy();
      expect(p.expiryDate, `${p.slug} is missing expiryDate`).toBeTruthy();
      // Money is integer paisa, never a float (§2 rule 5).
      expect(Number.isInteger(p.mrp), `${p.slug} mrp is not integer paisa`).toBe(true);
      expect(Number.isInteger(p.salePrice), `${p.slug} salePrice is not integer paisa`).toBe(true);
    }
  });
});
