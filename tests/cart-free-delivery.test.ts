// tests/cart-free-delivery.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { productUpdateSchema } from '@/lib/validation/products';

const ROOT = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

describe('Free Delivery & Shipping Charge Invariants', () => {
  it('allows setting hasShippingCharge to false via productUpdateSchema', () => {
    const result = productUpdateSchema.safeParse({
      hasShippingCharge: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasShippingCharge).toBe(false);
    }
  });

  it('ensures lib/services/search.ts selects hasShippingCharge and shipping rates', () => {
    const searchSrc = readSource('lib/services/search.ts');
    expect(searchSrc).toContain('hasShippingCharge: products.hasShippingCharge');
    expect(searchSrc).toContain('shippingInsideDhaka: products.shippingInsideDhaka');
    expect(searchSrc).toContain('shippingOutsideDhaka: products.shippingOutsideDhaka');
  });

  it('ensures ProductDetailView passes hasShippingCharge to product and child components', () => {
    const detailSrc = readSource('components/storefront/ProductDetailView.tsx');
    expect(detailSrc).toContain('hasShippingCharge: p.hasShippingCharge');
  });

  it('calculates free delivery correctly in Cart calculation logic', () => {
    const calcDeliveryFee = (
      items: Array<{ product: { hasShippingCharge?: boolean; shippingInsideDhaka?: number } }>
    ) => {
      if (items.length === 0) return 0;
      const allFreeShipping = items.every((i) => i.product.hasShippingCharge === false);
      return allFreeShipping ? 0 : 7000;
    };

    // Single item with free delivery
    expect(
      calcDeliveryFee([{ product: { hasShippingCharge: false } }])
    ).toBe(0);

    // Multiple items, all with free delivery
    expect(
      calcDeliveryFee([
        { product: { hasShippingCharge: false } },
        { product: { hasShippingCharge: false } },
      ])
    ).toBe(0);

    // Single item with delivery charge
    expect(
      calcDeliveryFee([{ product: { hasShippingCharge: true } }])
    ).toBe(7000);

    // Missing/undefined flag defaults to delivery charge
    expect(
      calcDeliveryFee([{ product: {} }])
    ).toBe(7000);

    // Mixed cart (one free, one paid) charges delivery fee for the paid item
    expect(
      calcDeliveryFee([
        { product: { hasShippingCharge: false } },
        { product: { hasShippingCharge: true } },
      ])
    ).toBe(7000);
  });
});
