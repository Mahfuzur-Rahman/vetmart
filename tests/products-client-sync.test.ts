// tests/products-client-sync.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MOCK_PRODUCTS,
  getStoredProducts,
  getStoredProductBySlug,
  saveStoredCustomProduct,
  deleteStoredProduct,
  STORAGE_KEY,
  DELETED_KEY,
  type MockProduct,
} from '@/lib/mock-data/products';

// Mock localStorage in Vitest environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k in mockStorage) delete mockStorage[k];
  },
  length: 0,
  key: (index: number) => Object.keys(mockStorage)[index] || null,
};

describe('Products Client & Demo Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when storage is empty and MOCK_PRODUCTS is empty', () => {
    const list = getStoredProducts();
    expect(list.length).toBe(0);
  });

  it('saves custom product and includes it in getStoredProducts() and getStoredProductBySlug()', () => {
    const newProduct: MockProduct = {
      id: 'prod-custom-999',
      slug: 'beximco-custom-injection',
      sku: 'VET-CUSTOM-999',
      nameEn: 'Beximco Custom Injection 50ml',
      nameBn: 'বেক্সিমকো কাস্টম ইনজেকশন ৫০মি.লি.',
      genericName: 'Ceftriaxone 1g',
      categorySlug: 'antibiotics',
      categoryNameEn: 'Antibiotics & Antimicrobials',
      categoryNameBn: 'অ্যান্টিবায়োটিক',
      manufacturerName: 'Beximco Pharmaceuticals Ltd',
      strength: '1g',
      dosageForm: 'Injection',
      packSize: '50ml',
      packUnit: 'vial',
      targetSpecies: ['cattle'],
      mrp: 35000,
      salePrice: 31000,
      requiresPrescription: true,
      requiresColdChain: true,
      isAntimicrobial: true,
      coldChain: true,
      dgdaRegNo: 'DAR-CUSTOM-001',
      batchNo: 'B-CUST-001',
      mfgDate: '2026-01-01',
      expiryDate: '2028-01-01',
      stockQty: 50,
      imageUrl: '/images/custom.jpg',
      banglishKeywords: 'beximco ceftriaxone injection',
      descriptionEn: 'Custom injectable',
      descriptionBn: 'কাস্টম ইনজেকশন',
      dosageEn: '1 vial per day',
      dosageBn: 'দৈনিক ১ ভায়াল',
    };

    saveStoredCustomProduct(newProduct);

    const list = getStoredProducts();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('prod-custom-999');

    const single = getStoredProductBySlug('beximco-custom-injection');
    expect(single).toBeDefined();
    expect(single?.nameEn).toBe('Beximco Custom Injection 50ml');
  });

  it('permanently removes custom product from catalog when deleted', () => {
    const newProduct: MockProduct = {
      id: 'prod-custom-888',
      slug: 'square-custom-bolus',
      sku: 'VET-CUSTOM-888',
      nameEn: 'Square Custom Bolus',
      nameBn: 'স্কয়ার কাস্টম বোলাস',
      genericName: 'Albendazole 600mg',
      categorySlug: 'anthelmintics',
      categoryNameEn: 'Anthelmintics',
      categoryNameBn: 'কৃমিনাশক',
      manufacturerName: 'Square Pharmaceuticals Ltd',
      strength: '600mg',
      dosageForm: 'Bolus',
      packSize: '10 bolus strip',
      packUnit: 'strip',
      targetSpecies: ['cattle'],
      mrp: 12000,
      salePrice: 10000,
      requiresPrescription: false,
      requiresColdChain: false,
      isAntimicrobial: false,
      coldChain: false,
      dgdaRegNo: 'DAR-CUSTOM-002',
      batchNo: 'B-CUST-002',
      mfgDate: '2026-01-01',
      expiryDate: '2028-01-01',
      stockQty: 100,
      imageUrl: '/images/bolus.jpg',
      banglishKeywords: 'square bolus albendazole',
      descriptionEn: 'Custom bolus',
      descriptionBn: 'কাস্টম বোলাস',
      dosageEn: '1 bolus per 50kg',
      dosageBn: '৫০ কেজি ওজনের জন্য ১টি বোলাস',
    };

    saveStoredCustomProduct(newProduct);
    expect(getStoredProducts().some((p) => p.id === newProduct.id)).toBe(true);

    deleteStoredProduct(newProduct.id, newProduct.slug);

    const list = getStoredProducts();
    expect(list.some((p) => p.id === newProduct.id)).toBe(false);
    expect(list.some((p) => p.slug === newProduct.slug)).toBe(false);
    expect(list.length).toBe(0);

    const check = getStoredProductBySlug(newProduct.slug);
    expect(check).toBeUndefined();
  });
});
