// lib/db/schema/system.ts
// Settings, Translations, Delivery Zones, Homepage sections, Coupons, Jobs (§4.2, §6, §14.2, §15.4)
import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { admins } from './auth';

// 1. Settings (Key-Value configuration with JSON payload §6, §14.3)
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  group: text('group').notNull().default('general'), // general, vat, inventory, shipping, payment, sms
  updatedBy: uuid('updated_by').references(() => admins.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Translations (Runtime DB overrides for UI strings §6, §15.4)
export const translations = pgTable('translations', {
  id: uuid('id').defaultRandom().primaryKey(),
  namespace: text('namespace').notNull().default('common'),
  key: text('key').notNull(),
  bn: text('bn').notNull(),
  en: text('en').notNull(),
  updatedBy: uuid('updated_by').references(() => admins.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('translations_ns_key_idx').on(t.namespace, t.key),
]);

// 3. Delivery Zones (§6, §14.2, §16)
export const deliveryZones = pgTable('delivery_zones', {
  id: uuid('id').defaultRandom().primaryKey(),
  division: text('division').notNull(),
  district: text('district').notNull(),
  upazila: text('upazila'), // Optional if district-wide
  rate: integer('rate').notNull(), // Delivery fee in integer paisa
  etaDays: integer('eta_days').notNull().default(3),
  codEnabled: boolean('cod_enabled').notNull().default(true),
  coldChainEnabled: boolean('cold_chain_enabled').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('delivery_zones_div_dist_idx').on(t.division, t.district),
]);

// 4. Homepage Sections (Dynamic content builder §6, §14.2)
export const homepageSections = pgTable('homepage_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(), // hero_slider, species_tiles, category_grid, product_rail, banner_strip
  sort: integer('sort').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  config: jsonb('config').notNull(), // bilingual content config
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Coupons (§6, §14.2)
export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // 'percentage', 'fixed', 'free_shipping'
  value: integer('value').notNull(), // paisa or percentage * 100
  minBasket: integer('min_basket').notNull().default(0), // in paisa
  scope: jsonb('scope'), // product/category IDs
  tierScope: text('tier_scope').array(),
  perUserLimit: integer('per_user_limit').notNull().default(1),
  totalLimit: integer('total_limit'),
  usedCount: integer('used_count').notNull().default(0),
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('coupons_code_idx').on(t.code),
]);

// 6. Jobs (For pg-cron driver in demo environment §4.2)
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  runAt: timestamp('run_at', { withTimezone: true }).defaultNow().notNull(),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  status: text('status').notNull().default('pending'), // pending, running, done, failed
  lastError: text('last_error'),
  lockedAt: timestamp('locked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('jobs_status_run_at_idx').on(t.status, t.runAt),
]);
