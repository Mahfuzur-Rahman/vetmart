// lib/mock-data/orders.ts

export type OrderStatus = 'pending' | 'pharmacist_review' | 'dispatched' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'card';

export interface OrderItem {
  productId: string;
  productSlug: string;
  productNameEn: string;
  productNameBn: string;
  unitPrice: number; // integer paisa
  quantity: number;
  totalPrice: number; // integer paisa
  batchNo: string;
}

export interface MockOrder {
  id: string;
  orderNumber: string; // e.g. VM-BD-98214
  customerName: string;
  customerPhone: string;
  customerType: 'vet' | 'retail' | 'farm';
  recipientAddress: string;
  district: string;
  division: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'unpaid' | 'pending';
  requiresRx: boolean;
  rxApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'ord-101',
    orderNumber: 'VM-BD-98214',
    customerName: 'Dr. Anisur Rahman (BVC #10492)',
    customerPhone: '01711000000',
    customerType: 'vet',
    recipientAddress: 'Holding 42, Station Road, Mymensingh Sadar',
    district: 'Mymensingh',
    division: 'Mymensingh',
    status: 'pharmacist_review',
    items: [
      {
        productId: 'prod-1',
        productSlug: 'renaflox-100ml',
        productNameEn: 'Renaflox 100ml Oral Solution',
        productNameBn: 'রেনাফ্লক্স ১০০মি.লি. ওরাল সলিউশন',
        unitPrice: 15000, // Vet price ৳150
        quantity: 5,
        totalPrice: 75000,
        batchNo: 'B-REN-8912',
      },
      {
        productId: 'prod-3',
        productSlug: 'acimec-1-injection-10ml',
        productNameEn: 'Acimec 1% Injection 10ml',
        productNameBn: 'এসিমেক ১% ইনজেকশন ১০মি.লি.',
        unitPrice: 12000,
        quantity: 3,
        totalPrice: 36000,
        batchNo: 'B-ACM-2201',
      },
    ],
    subtotal: 111000,
    deliveryFee: 13000, // ৳130 outside Dhaka
    totalAmount: 124000, // ৳1,240.00
    paymentMethod: 'bkash',
    paymentStatus: 'paid',
    requiresRx: true,
    rxApproved: false,
    createdAt: '2026-08-11T14:30:00Z',
    updatedAt: '2026-08-11T14:35:00Z',
  },
  {
    id: 'ord-102',
    orderNumber: 'VM-BD-98213',
    customerName: 'Rahim Poultry & Dairy Farm',
    customerPhone: '01812998877',
    customerType: 'farm',
    recipientAddress: 'Chowdhury Bari Road, Joydebpur',
    district: 'Gazipur',
    division: 'Dhaka',
    status: 'dispatched',
    items: [
      {
        productId: 'prod-2',
        productSlug: 'rena-ws-100g',
        productNameEn: 'Rena-WS 100g Soluble Powder',
        productNameBn: 'রেনা-ডব্লিউএস ১০০গ্রাম পাউডার',
        unitPrice: 11000,
        quantity: 10,
        totalPrice: 110000,
        batchNo: 'B-RWS-4410',
      },
      {
        productId: 'prod-5',
        productSlug: 'square-vet-c-500g',
        productNameEn: 'Square Vet-C 99% Powder 500g',
        productNameBn: 'স্কয়ার ভেট-সি ৯৯% পাউডার ৫০০গ্রাম',
        unitPrice: 32000,
        quantity: 2,
        totalPrice: 64000,
        batchNo: 'B-SQC-1102',
      },
    ],
    subtotal: 174000,
    deliveryFee: 10000, // ৳100 Gazipur
    totalAmount: 184000, // ৳1,840.00
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    requiresRx: false,
    createdAt: '2026-08-11T09:15:00Z',
    updatedAt: '2026-08-11T11:00:00Z',
  },
  {
    id: 'ord-103',
    orderNumber: 'VM-BD-98212',
    customerName: 'Tanvir Ahmed',
    customerPhone: '01911223344',
    customerType: 'retail',
    recipientAddress: 'House 14, Road 7, Dhanmondi',
    district: 'Dhaka',
    division: 'Dhaka',
    status: 'delivered',
    items: [
      {
        productId: 'prod-6',
        productSlug: 'petcare-shampoo-kit',
        productNameEn: 'PetCare Herbal Anti-Tick Shampoo Kit',
        productNameBn: 'পেটকেয়ার ভেষজ অ্যান্টি-টিক শ্যাম্পু কিট',
        unitPrice: 89000,
        quantity: 1,
        totalPrice: 89000,
        batchNo: 'B-PET-5501',
      },
    ],
    subtotal: 89000,
    deliveryFee: 7000, // ৳70 Inside Dhaka
    totalAmount: 96000, // ৳960.00
    paymentMethod: 'nagad',
    paymentStatus: 'paid',
    requiresRx: false,
    createdAt: '2026-08-10T16:20:00Z',
    updatedAt: '2026-08-11T12:00:00Z',
  },
  {
    id: 'ord-104',
    orderNumber: 'VM-BD-98211',
    customerName: 'Kashem Dairy Farm',
    customerPhone: '01715544332',
    customerType: 'farm',
    recipientAddress: 'Sherpur Road, Jaltaibari',
    district: 'Bogura',
    division: 'Rajshahi',
    status: 'pending',
    items: [
      {
        productId: 'prod-4',
        productSlug: 'eon-cal-p-1L',
        productNameEn: 'Eon Cal-P 1 Liter Liquid',
        productNameBn: 'ইয়ন ক্যাল-পি ১ লিটার লিকুইড',
        unitPrice: 45000,
        quantity: 4,
        totalPrice: 180000,
        batchNo: 'B-EON-9901',
      },
    ],
    subtotal: 180000,
    deliveryFee: 13000,
    totalAmount: 193000, // ৳1,930.00
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    requiresRx: false,
    createdAt: '2026-08-11T16:00:00Z',
    updatedAt: '2026-08-11T16:00:00Z',
  },
];
