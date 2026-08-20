// lib/db/schema/orders.ts
// Carts, Orders, Snapshots, Prescriptions, Shipments, Invoices (§5.5, §6, §11, §12)
import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { products, productBatches } from './catalog';

export const orderStatusEnum = pgEnum('order_status', [
  'placed',
  'awaiting_rx_review',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cod',
  'sslcommerz',
  'bkash_direct',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const rxStatusEnum = pgEnum('rx_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);

// 1. Carts & Cart Items (§6)
export const carts = pgTable('carts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id'), // For guest carts
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('carts_user_idx').on(t.userId),
  index('carts_session_idx').on(t.sessionId),
]);

export const cartItems = pgTable('cart_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  qty: integer('qty').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('cart_items_cart_product_idx').on(t.cartId, t.productId),
]);

// 2. Prescriptions (§5.5)
export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  imagePaths: text('image_paths').array().notNull(),
  vetName: text('vet_name'),
  vetBvcRegNo: text('vet_bvc_reg_no'),
  issuedDate: timestamp('issued_date', { withTimezone: true }),
  status: rxStatusEnum('status').notNull().default('pending'),
  reviewedByAdminId: uuid('reviewed_by_admin_id'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  rejectReason: text('reject_reason'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('prescriptions_user_idx').on(t.userId),
  index('prescriptions_status_idx').on(t.status),
]);

// 3. Orders (§6)
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNo: text('order_no').notNull().unique(), // Formatted e.g. ORD-2608-0001 (Western digits always §15.3.4)
  userId: uuid('user_id').references(() => users.id),
  status: orderStatusEnum('status').notNull().default('placed'),

  // Financial amounts in integer paisa (§2 rule 5)
  subtotal: integer('subtotal').notNull(),
  discount: integer('discount').notNull().default(0),
  vat: integer('vat').notNull().default(0),
  shipping: integer('shipping').notNull().default(0),
  total: integer('total').notNull(),

  paymentMethod: paymentMethodEnum('payment_method').notNull().default('cod'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),

  // Snapshot delivery address so order is reconstructible years later (§6)
  addressSnapshot: jsonb('address_snapshot').notNull(),
  fulfilmentChannel: text('fulfilment_channel').notNull().default('steadfast'), // steadfast, own_rider, cold_chain
  rxId: uuid('rx_id').references(() => prescriptions.id),

  // Guest / social express orders carry the contact details inline because
  // there is no user row or address book entry to point at.
  guestName: text('guest_name'),
  guestPhone: text('guest_phone'), // canonical 8801XXXXXXXXX (§20)

  // Marketing attribution for social express orders (§14.2 Marketing).
  sourceChannel: text('source_channel'),
  utmSource: text('utm_source'),
  utmCampaign: text('utm_campaign'),

  // §9: POST /orders requires an Idempotency-Key. BD mobile data drops
  // mid-request constantly; without this a retry creates a duplicate order and
  // a duplicate Steadfast consignment. The unique index is what enforces it.
  idempotencyKey: text('idempotency_key'),

  placedAt: timestamp('placed_at', { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
}, (t) => [
  index('orders_user_placed_idx').on(t.userId, t.placedAt),
  index('orders_status_idx').on(t.status),
  index('orders_order_no_idx').on(t.orderNo),
  index('orders_guest_phone_idx').on(t.guestPhone),
  uniqueIndex('orders_idempotency_key_idx').on(t.idempotencyKey),
]);

// 4. Order Items (Snapshot everything: generic, batch, expiry, withdrawal periods §6)
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  batchId: uuid('batch_id').references(() => productBatches.id).notNull(),

  // Snapshots
  nameSnapshotEn: text('name_snapshot_en').notNull(),
  nameSnapshotBn: text('name_snapshot_bn').notNull(),
  genericSnapshot: text('generic_snapshot'),
  batchNo: text('batch_no').notNull(),
  expiryDate: timestamp('expiry_date', { withTimezone: true }).notNull(),

  qty: integer('qty').notNull(),
  unitPrice: integer('unit_price').notNull(), // in paisa
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('0.00'),
  lineTotal: integer('line_total').notNull(), // in paisa

  // Crucial for food-animal invoice warnings (§5.2, §11)
  withdrawalMeatDays: integer('withdrawal_meat_days').default(0),
  withdrawalMilkHours: integer('withdrawal_milk_hours').default(0),
}, (t) => [
  index('order_items_order_idx').on(t.orderId),
]);

// 5. Order Events (Audit timeline for every transition §6)
export const orderEvents = pgTable('order_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actor: text('actor').notNull(), // 'customer', 'admin', 'system', 'steadfast_webhook'
  note: text('note'),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('order_events_order_idx').on(t.orderId),
]);

// 6. Shipments (§6, §12)
export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  courier: text('courier').notNull().default('steadfast'),
  consignmentId: text('consignment_id').notNull(),
  trackingCode: text('tracking_code').notNull(),
  status: text('status').notNull().default('pending'),
  codAmount: integer('cod_amount').notNull(), // in paisa
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('shipments_order_idx').on(t.orderId),
  index('shipments_consignment_idx').on(t.consignmentId),
]);

// 7. Payments (§6, §13)
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  gateway: text('gateway').notNull(), // 'cod', 'sslcommerz', 'bkash'
  gatewayTxnId: text('gateway_txn_id'),
  amount: integer('amount').notNull(), // in paisa
  status: paymentStatusEnum('status').notNull().default('pending'),
  raw: jsonb('raw'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('payments_order_idx').on(t.orderId),
]);

// 8. Invoices (§6, §11)
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  invoiceNo: text('invoice_no').notNull().unique(), // INV-{YY}{MM}-{seq} (§11)
  pdfPath: text('pdf_path'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('invoices_order_idx').on(t.orderId),
  index('invoices_invoice_no_idx').on(t.invoiceNo),
]);

// 9. Incomplete Orders / Social Media Campaign Leads (§6, §14)
export const incompleteOrders = pgTable('incomplete_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').notNull(),
  name: text('name'),
  address: text('address'),
  division: text('division'),
  district: text('district'),
  upazila: text('upazila'),
  items: jsonb('items').notNull(), // Array of { productId, productSlug, productNameEn, productNameBn, unitPrice, quantity, totalPrice, packSize }
  subtotal: integer('subtotal').notNull(), // in paisa
  deliveryFee: integer('delivery_fee').notNull().default(0), // in paisa
  totalAmount: integer('total_amount').notNull(), // in paisa
  utmSource: text('utm_source'),
  utmCampaign: text('utm_campaign'),
  utmMedium: text('utm_medium'),
  status: text('status').notNull().default('incomplete'), // 'incomplete', 'contacted', 'converted', 'discarded'
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('incomplete_orders_phone_idx').on(t.phone),
  index('incomplete_orders_status_idx').on(t.status),
  index('incomplete_orders_created_at_idx').on(t.createdAt),
]);

