// lib/mock-data/incomplete-orders.ts
// Incomplete Orders, Abandoned Leads, and BD Phone Helpers for Social Media Campaigns

export type IncompleteOrderStatus = 'incomplete' | 'contacted' | 'converted' | 'discarded';

export interface IncompleteOrderItem {
  productId: string;
  productSlug: string;
  productNameEn: string;
  productNameBn: string;
  unitPrice: number; // in paisa
  quantity: number;
  totalPrice: number; // in paisa
  packSize?: string | null;
  imageUrl?: string | null;
}

export interface IncompleteOrder {
  id: string;
  phone: string;
  name?: string | null;
  address?: string | null;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  items: IncompleteOrderItem[];
  subtotal: number; // in paisa
  deliveryFee: number; // in paisa
  totalAmount: number; // in paisa
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmMedium?: string | null;
  status: IncompleteOrderStatus;
  adminNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const INCOMPLETE_ORDERS_STORAGE_KEY = 'vetmart_incomplete_orders_v1';

/**
 * Validates Bangladesh mobile phone numbers.
 * Format: 013, 014, 015, 016, 017, 018, 019 followed by 8 digits (total 11 digits).
 */
export function isValidBdPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = sanitizeBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(cleaned);
}

/**
 * Sanitizes phone numbers by stripping country code (+88 / 88), spaces, dashes, and extra characters.
 */
export function sanitizeBdPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+880')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('+88')) {
    cleaned = cleaned.substring(3);
  }
  return cleaned.trim();
}

/**
 * Initial sample leads for demo and preview purposes
 */
export const INITIAL_MOCK_INCOMPLETE_ORDERS: IncompleteOrder[] = [
  {
    id: 'inc-ord-101',
    phone: '01712984512',
    name: 'Dr. Tariqul Islam (Veterinarian)',
    address: 'Bhairab Bazar Animal Care, Near Post Office',
    division: 'Dhaka',
    district: 'Kishoreganj',
    upazila: 'Bhairab',
    items: [
      {
        productId: 'prod-1',
        productSlug: 'renaflox-100ml',
        productNameEn: 'Renaflox 100ml Oral Solution',
        productNameBn: 'রেনাফ্লক্স ১০০মি.লি. ওরাল সলিউশন',
        unitPrice: 16500,
        quantity: 5,
        totalPrice: 82500,
        packSize: '100ml',
        imageUrl: '/images/products/renaflox.png',
      },
    ],
    subtotal: 82500,
    deliveryFee: 13000,
    totalAmount: 95500,
    utmSource: 'facebook',
    utmCampaign: 'poultry_boost_august',
    utmMedium: 'cpc',
    status: 'incomplete',
    adminNotes: 'Customer added phone number and farm location, dropped before final payment step.',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'inc-ord-102',
    phone: '01844901234',
    name: 'Md. Shahidul Alam (Broiler Farm)',
    address: 'Alam Poultry Project, Master Para',
    division: 'Chattogram',
    district: 'Cumilla',
    upazila: 'Chandina',
    items: [
      {
        productId: 'prod-2',
        productSlug: 'rena-ws-100g',
        productNameEn: 'Rena-WS 100g Soluble Powder',
        productNameBn: 'রেনা-ডব্লিউএস ১০০গ্রাম পাউডার',
        unitPrice: 11000,
        quantity: 10,
        totalPrice: 110000,
        packSize: '100g',
        imageUrl: '/images/products/rena-ws.png',
      },
      {
        productId: 'prod-3',
        productSlug: 'electromin-1kg',
        productNameEn: 'Electromin 1kg Electrolyte',
        productNameBn: 'ইলেক্ট্রোমিন ১কেজি ইলেক্ট্রোলাইট',
        unitPrice: 28000,
        quantity: 2,
        totalPrice: 56000,
        packSize: '1kg',
        imageUrl: '/images/products/electromin.png',
      },
    ],
    subtotal: 166000,
    deliveryFee: 13000,
    totalAmount: 179000,
    utmSource: 'instagram',
    utmCampaign: 'heat_stress_electrolytes',
    utmMedium: 'story_ad',
    status: 'contacted',
    adminNotes: 'Admin called via WhatsApp. Farmer asked to hold for tomorrow morning delivery.',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago
    updatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'inc-ord-103',
    phone: '01923456789',
    name: 'Kashem Dairy Farm',
    address: 'Village: Ghorashal, Union: Palash',
    division: 'Dhaka',
    district: 'Narsingdi',
    upazila: 'Palash',
    items: [
      {
        productId: 'prod-4',
        productSlug: 'cal-d-plex-1l',
        productNameEn: 'Cal-D-Plex 1L Calcium Tonic',
        productNameBn: 'ক্যাল-ডি-প্লেক্স ১লি. ক্যালসিয়াম টনিক',
        unitPrice: 42000,
        quantity: 3,
        totalPrice: 126000,
        packSize: '1 Litre',
        imageUrl: '/images/products/cal-d-plex.png',
      },
    ],
    subtotal: 126000,
    deliveryFee: 7000,
    totalAmount: 133000,
    utmSource: 'youtube',
    utmCampaign: 'dairy_yield_masterclass',
    utmMedium: 'video_ad',
    status: 'incomplete',
    adminNotes: null,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Client-safe storage helper to get incomplete orders
 */
export function getStoredIncompleteOrders(): IncompleteOrder[] {
  if (typeof window === 'undefined') return INITIAL_MOCK_INCOMPLETE_ORDERS;
  try {
    const raw = localStorage.getItem(INCOMPLETE_ORDERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INCOMPLETE_ORDERS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_INCOMPLETE_ORDERS));
      return INITIAL_MOCK_INCOMPLETE_ORDERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_MOCK_INCOMPLETE_ORDERS;
  } catch {
    return INITIAL_MOCK_INCOMPLETE_ORDERS;
  }
}

/**
 * Client-safe storage helper to save incomplete orders
 */
export function saveStoredIncompleteOrders(orders: IncompleteOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INCOMPLETE_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Failed to save incomplete orders to localStorage', e);
  }
}
