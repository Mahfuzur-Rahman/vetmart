// lib/db/schema/auth.ts
// Auth, RBAC, customer and audit tables (§6, §8, §14.1, §14.4)
import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const customerTierEnum = pgEnum('customer_tier', [
  'retail',
  'vet',
  'pharmacy',
  'farm',
  'distributor',
]);

// 1. Users (Storefront customers)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').notNull().unique(), // Canonical 8801XXXXXXXXX (§20)
  email: text('email'),
  name: text('name'),
  passwordHash: text('password_hash'),
  locale: text('locale').notNull().default('bn'),
  tier: customerTierEnum('tier').notNull().default('retail'),
  isVerifiedVet: boolean('is_verified_vet').notNull().default(false),
  bvcRegNo: text('bvc_reg_no'), // Bangladesh Veterinary Council registration number
  creditLimit: integer('credit_limit').notNull().default(0), // in integer paisa (§2 rule 5)
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('users_phone_idx').on(t.phone),
  index('users_tier_idx').on(t.tier),
]);

// 2. Addresses (Customer address book with BD administrative hierarchy §20)
export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull().default('Home'), // Home, Farm, Clinic, Pharmacy
  recipientName: text('recipient_name').notNull(),
  phone: text('phone').notNull(),
  division: text('division').notNull(), // Dhaka, Chattogram, Rajshahi, etc.
  district: text('district').notNull(), // Bogura, Gazipur, Cumilla, etc.
  upazila: text('upazila').notNull(),
  area: text('area'),
  addressLine: text('address_line').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('addresses_user_id_idx').on(t.userId),
]);

// 3. Admins (Admin panel operators — separate from users table §8, §14.1)
export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Roles & Permissions (RBAC §14.1)
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(), // super_admin, pharmacist, inventory, order_ops, content, accounts, support
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  description: text('description'),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(), // 'product.write', 'order.refund', 'stock.adjust', etc.
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  index('role_permissions_role_idx').on(t.roleId),
]);

export const adminRoles = pgTable('admin_roles', {
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
}, (t) => [
  index('admin_roles_admin_idx').on(t.adminId),
]);

// 5. Audit Log (Mandatory for every mutation §14.4)
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminId: uuid('admin_id').references(() => admins.id),
  action: text('action').notNull(), // create, update, delete, status_change, stock_adjust
  entity: text('entity').notNull(), // product, batch, order, settings, role
  entityId: text('entity_id').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  ip: text('ip'),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('audit_log_entity_idx').on(t.entity, t.entityId),
  index('audit_log_admin_idx').on(t.adminId),
  index('audit_log_at_idx').on(t.at),
]);

// 6. Device Sessions (Mobile JWT token revocation §8)
export const deviceSessions = pgTable('device_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  deviceName: text('device_name'),
  fcmToken: text('fcm_token'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('device_sessions_user_idx').on(t.userId),
]);

// 7. OTP Requests (6 digits, 3m TTL §8)
export const otpRequests = pgTable('otp_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').notNull(),
  codeHash: text('code_hash').notNull(),
  purpose: text('purpose').notNull().default('login'), // login, verify_phone, reset_password
  attempts: integer('attempts').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('otp_requests_phone_idx').on(t.phone),
]);
