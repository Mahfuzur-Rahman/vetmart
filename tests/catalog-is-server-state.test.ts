// tests/catalog-is-server-state.test.ts
// Asserts the catalog is purely server state and no client component accesses localStorage.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import * as productTypeModule from '@/lib/types/product';

const ROOT = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

/** Every surface that previously could have touched client-side localStorage. */
const CATALOG_SURFACES = [
  'components/storefront/ProductsCatalogView.tsx',
  'components/storefront/FeaturedProductsGrid.tsx',
  'components/storefront/SpeciesProductsView.tsx',
  'components/storefront/ProductDetailView.tsx',
  'components/storefront/ExpressOrderView.tsx',
  'components/admin/AdminProductsTable.tsx',
];

describe('the browser-side catalog store is gone', () => {
  it('keeps PRODUCTS_UPDATED_EVENT for post-write refresh nudges', () => {
    expect(productTypeModule.PRODUCTS_UPDATED_EVENT).toBe('vetmart_products_updated');
  });

  it.each(CATALOG_SURFACES)('%s does not touch localStorage for the catalog', (relPath) => {
    const src = readSource(relPath);
    expect(src).not.toContain('vetmart_custom_products');
    expect(src).not.toContain('vetmart_deleted_product_ids');
    expect(src).not.toContain('getStoredProducts');
    expect(src).not.toContain('saveStoredCustomProduct');
  });
});
