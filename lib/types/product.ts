// lib/types/product.ts
// Product model interface and catalog event constants

export interface Product {
  id: string;
  slug: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  genericName: string;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameBn: string;
  drugClassificationSlug?: string;
  drugClassificationNameEn?: string;
  drugClassificationNameBn?: string;
  manufacturerName: string;

  strength: string;
  dosageForm: string;
  packSize: string;
  packUnit: string;
  targetSpecies: string[];
  mrp: number; // in integer paisa (e.g. 18000 = ৳180.00)
  salePrice: number; // in integer paisa
  vetPrice?: number;
  requiresPrescription: boolean;
  requiresColdChain: boolean;
  isAntimicrobial: boolean;
  coldChain: boolean;
  dgdaRegNo: string;
  batchNo: string;
  expiryDate: string;
  mfgDate: string;
  stockQty: number;
  imageUrl: string;
  banglishKeywords: string;
  descriptionEn: string;
  descriptionBn: string;
  dosageEn: string;
  dosageBn: string;
}

// Alias for existing component prop signatures
export type MockProduct = Product;

/**
 * Dispatched on `window` after a successful catalog write so any mounted view
 * can re-fetch from the API. Carries no payload: the server is the source of
 * truth, this is only a "go and ask again" nudge.
 */
export const PRODUCTS_UPDATED_EVENT = 'vetmart_products_updated';
