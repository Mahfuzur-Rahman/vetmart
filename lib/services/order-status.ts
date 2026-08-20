// lib/services/order-status.ts
// Order status vocabulary shared by the server and the admin board.
//
// Kept separate from lib/services/orders.ts because that module imports the
// database client; a Client Component importing it would pull postgres-js (and
// node:fs / node:net) into the browser bundle.

/** The status vocabulary the admin board renders. */
export type AdminOrderStatus =
  | 'pending'
  | 'pharmacist_review'
  | 'dispatched'
  | 'delivered'
  | 'cancelled';

/**
 * The database has a finer-grained status enum than the board shows (§6). Map
 * in one place so the two vocabularies cannot drift.
 */
export const DB_TO_BOARD_STATUS: Record<string, AdminOrderStatus> = {
  placed: 'pending',
  awaiting_rx_review: 'pharmacist_review',
  confirmed: 'pending',
  processing: 'pending',
  shipped: 'dispatched',
  delivered: 'delivered',
  cancelled: 'cancelled',
  returned: 'cancelled',
};

/** Inverse mapping, used when the board drives a status change. */
export const BOARD_TO_DB_STATUS: Record<AdminOrderStatus, string> = {
  pending: 'confirmed',
  pharmacist_review: 'awaiting_rx_review',
  dispatched: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
};
