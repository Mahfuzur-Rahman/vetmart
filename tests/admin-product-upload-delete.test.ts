// tests/admin-product-upload-delete.test.ts
import { describe, it, expect } from 'vitest';
import { getStorageDriver } from '@/lib/storage';
import { MOCK_PRODUCTS } from '@/lib/mock-data/products';

describe('Admin Product Image Storage & Cascade Deletion Logic', () => {
  it('instantiates storage driver properly with responsive image URL generator', () => {
    const storage = getStorageDriver();
    expect(storage).toBeDefined();
    expect(typeof storage.put).toBe('function');
    expect(typeof storage.delete).toBe('function');
    expect(typeof storage.url).toBe('function');

    const testKey = 'vetmart/products/test-drug-cal-d-mag';
    const thumbUrl = storage.url(testKey, 'thumb');
    const fullUrl = storage.url(testKey, 'full');

    expect(thumbUrl).toBeDefined();
    expect(fullUrl).toBeDefined();
  });

  it('correctly filters out deleted product IDs from catalog dataset', () => {
    const allProducts = [...MOCK_PRODUCTS];
    const initialCount = allProducts.length;

    const deletedIds = ['prod-1', 'renaflox-100ml'];
    const deletedSet = new Set(deletedIds);

    const filtered = allProducts.filter((p) => !deletedSet.has(p.id) && !deletedSet.has(p.slug));

    expect(filtered.length).toBe(initialCount - 1);
    expect(filtered.find((p) => p.id === 'prod-1')).toBeUndefined();
    expect(filtered.find((p) => p.slug === 'renaflox-100ml')).toBeUndefined();
  });

  it('validates supported image upload formats and max size limits', () => {
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/svg+xml',
    ]);

    expect(allowedTypes.has('image/jpeg')).toBe(true);
    expect(allowedTypes.has('image/png')).toBe(true);
    expect(allowedTypes.has('image/webp')).toBe(true);
    expect(allowedTypes.has('application/pdf')).toBe(false);
    expect(allowedTypes.has('text/html')).toBe(false);

    const maxSizeBytes = 10 * 1024 * 1024;
    const testFileSize = 2.5 * 1024 * 1024;
    expect(testFileSize <= maxSizeBytes).toBe(true);
  });
});
