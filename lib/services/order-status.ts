// lib/services/order-status.ts
// Order status vocabulary and client-safe order models shared by the server and admin board.

/** The status vocabulary the admin board renders. */
export type AdminOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'pharmacist_review'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

export type OrderStatus = AdminOrderStatus;
export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'card';

export interface OrderItem {
  productId: string;
  productSlug: string;
  productNameEn: string;
  productNameBn: string;
  unitPrice: number; // integer paisa
  quantity: number;
  totalPrice: number; // integer paisa
  batchNo?: string;
}

export interface MockOrder {
  id: string;
  orderNumber: string;
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
  paymentMethod: PaymentMethod | string;
  paymentStatus: 'paid' | 'unpaid' | 'pending' | string;
  requiresRx: boolean;
  rxApproved?: boolean;
  courierConsignmentId?: string;
  trackingCode?: string;
  dispatchedAt?: string;
  courierStatus?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * The database status enum mapped to board vocabulary (§6).
 */
export const DB_TO_BOARD_STATUS: Record<string, AdminOrderStatus> = {
  placed: 'pending',
  awaiting_rx_review: 'pharmacist_review',
  confirmed: 'confirmed',
  processing: 'processing',
  shipped: 'dispatched',
  delivered: 'delivered',
  cancelled: 'cancelled',
  returned: 'cancelled',
};

/** Inverse mapping, used when the board drives a status change. */
export const BOARD_TO_DB_STATUS: Record<AdminOrderStatus, string> = {
  pending: 'placed',
  confirmed: 'confirmed',
  processing: 'processing',
  pharmacist_review: 'awaiting_rx_review',
  dispatched: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};
