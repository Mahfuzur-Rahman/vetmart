// lib/db/schema/catalog.ts
// Product catalog, batches, and immutable stock ledger (§5, §6)
import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, index, pgEnum, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users, admins } from './auth';

// Product Classification (§5.1)
export const productTypeEnum = pgEnum('product_type', [
  'drug_otc',
  'drug_rx',
  'vaccine',
  'feed_supplement',
  'instrument',
  'disinfectant',
  'pet_food',
  'accessory',
]);

// Storage condition (§5.2)
export const storageConditionEnum = pgEnum('storage_condition', [
  'room_temp',
  'cool_dry',
  '2_8_celsius',
  'frozen',
]);

// Stock Ledger Movement Reason (§2 rule 3, §5.3, §6)
export const stockLedgerReasonEnum = pgEnum('stock_ledger_reason', [
  'purchase',
  'sale',
  'return',
  'adjust',
  'expiry',
]);

// 1. Manufacturers (Renata, ACI, Square, SK+F, ACME, Eon, etc. §5.2)
export const manufacturers = pgTable('manufacturers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  country: text('country').notNull().default('Bangladesh'),
  logoPath: text('logo_path'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Categories (Bilingual category tree §6)
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  parentId: uuid('parent_id'),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  imagePath: text('image_path'),
  sort: integer('sort').notNull().default(0),
  showOnHomepage: boolean('show_on_homepage').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('categories_slug_idx').on(t.slug),
  index('categories_parent_idx').on(t.parentId),
]);

// 2b. Target Species Categories (Animal browsing axis: Cow, Buffalo, Goat, Poultry, etc. §2, §7)
export const speciesCategories = pgTable('species_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(), // e.g. 'cattle', 'buffalo', 'goat_sheep', 'poultry', 'fish', 'dog', 'cat', 'pigeon'
  slug: text('slug').notNull().unique(), // e.g. 'cattle', 'buffalo', 'goat-sheep', etc.
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  emoji: text('emoji').notNull().default('🐾'),
  imagePath: text('image_path'),
  descriptionEn: text('description_en'),
  descriptionBn: text('description_bn'),
  sort: integer('sort').notNull().default(0),
  showOnHomepage: boolean('show_on_homepage').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('species_categories_key_idx').on(t.key),
  index('species_categories_slug_idx').on(t.slug),
  index('species_categories_sort_idx').on(t.sort),
]);


// 2c. Drug Classifications (Pharmacological / therapeutic classifications for menu & catalog §5.2)
export const drugClassifications = pgTable('drug_classifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(), // e.g. 'vaccine', 'antibiotics', 'vitamins', 'disinfectants', 'dewormers', 'hormones', 'nsaids-pain'
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  emoji: text('emoji').notNull().default('💊'),
  descriptionEn: text('description_en'),
  descriptionBn: text('description_bn'),
  sort: integer('sort').notNull().default(0),
  showOnMenu: boolean('show_on_menu').notNull().default(true),
  showOnHomepage: boolean('show_on_homepage').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('drug_classifications_slug_idx').on(t.slug),
  index('drug_classifications_sort_idx').on(t.sort),
]);

// 3. Products (Regulated veterinary medicine catalog §5.2, §6)
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameBn: text('name_bn').notNull(),
  genericName: text('generic_name'), // Index with trigram for generic search (§5.2, §6)
  productType: productTypeEnum('product_type').notNull(),
  manufacturerId: uuid('manufacturer_id').references(() => manufacturers.id),
  categoryId: uuid('category_id').references(() => categories.id),
  drugClassificationId: uuid('drug_classification_id').references(() => drugClassifications.id),

  // Veterinary specifications (§5.2)
  strength: text('strength'), // e.g. "100 mg/ml", "10% w/v"
  strengthUnit: text('strength_unit'),
  dosageForm: text('dosage_form'), // injection, bolus, powder, oral solution, premix, spray
  packSize: text('pack_size'), // e.g. "100 ml vial", "strip of 10 boluses"
  packUnit: text('pack_unit'),
  targetSpecies: text('target_species').array().notNull().default(sql`'{}'::text[]`), // cattle, buffalo, goat_sheep, poultry, fish, dog, cat, pigeon

  // Withdrawal periods for food-animal drugs (§5.2, §11)
  withdrawalMeatDays: integer('withdrawal_meat_days').default(0),
  withdrawalMilkHours: integer('withdrawal_milk_hours').default(0),

  // Regulatory & storage (§5.2)
  dgdaRegistrationNo: text('dgda_registration_no'), // DGDA reference number
  storageCondition: storageConditionEnum('storage_condition').notNull().default('room_temp'),
  requiresColdChain: boolean('requires_cold_chain').notNull().default(false),
  requiresPrescription: boolean('requires_prescription').notNull().default(false),
  isAntimicrobial: boolean('is_antimicrobial').notNull().default(false), // For AMR stewardship reporting

  // Financials — Money handled in integer paisa (§2 rule 5)
  vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('0.00'), // e.g. 0.00, 5.00, 15.00
  mrp: integer('mrp').notNull(), // in integer paisa
  salePrice: integer('sale_price').notNull(), // in integer paisa

  // Search & Status
  banglishKeywords: text('banglish_keywords'), // e.g. "gorur oshudh, pet fula" (§20)
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('products_slug_idx').on(t.slug),
  index('products_sku_idx').on(t.sku),
  index('products_generic_idx').on(t.genericName),
  index('products_type_idx').on(t.productType),
  index('products_manufacturer_idx').on(t.manufacturerId),
  index('products_category_idx').on(t.categoryId),
  index('products_drug_class_idx').on(t.drugClassificationId),
  index('products_active_idx').on(t.isActive),
]);

// 4. Product Images (Stores base path only, never full URL §4.2, §10)
export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  basePath: text('base_path').notNull(), // e.g. "vetmart/products/{hash}"
  blurhash: text('blurhash'),
  altEn: text('alt_en'),
  altBn: text('alt_bn'),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('product_images_product_idx').on(t.productId),
]);

// 5. Product Batches — Mandatory on every drug/vaccine/feed SKU (§2 rule 4, §5.3)
export const productBatches = pgTable('product_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  batchNo: text('batch_no').notNull(),
  mfgDate: timestamp('mfg_date', { withTimezone: true }).notNull(),
  expiryDate: timestamp('expiry_date', { withTimezone: true }).notNull(),
  qtyReceived: integer('qty_received').notNull(),
  costPrice: integer('cost_price').notNull(), // in integer paisa
  supplierId: text('supplier_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('product_batches_product_expiry_idx').on(t.productId, t.expiryDate),
  index('product_batches_batch_no_idx').on(t.batchNo),
]);

// 6. Stock Ledger — Immutable audit trail of every stock movement (§2 rule 3, §5.3)
// NEVER `UPDATE products SET stock = stock - 1`. Current stock is DERIVED.
export const stockLedger = pgTable('stock_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  batchId: uuid('batch_id').references(() => productBatches.id, { onDelete: 'cascade' }).notNull(),
  delta: integer('delta').notNull(), // Positive for receipt/return, negative for sale/adjust/expiry
  reason: stockLedgerReasonEnum('reason').notNull(),
  refType: text('ref_type'), // 'order', 'purchase_invoice', 'manual_adjustment', 'expiry_writeoff'
  refId: text('ref_id'),
  adminId: uuid('admin_id').references(() => admins.id),
  at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('stock_ledger_product_batch_idx').on(t.productId, t.batchId),
  index('stock_ledger_at_idx').on(t.at),
]);

// 7. Product Reviews — Verified Farmer & Vet Ratings (§5, §6)
export const productReviews = pgTable('product_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  authorName: text('author_name').notNull(),
  authorRole: text('author_role').notNull().default('dairy_farmer'), // dairy_farmer, poultry_farmer, vet_dvm, pet_owner, farmer
  location: text('location'),
  rating: integer('rating').notNull(), // 1 to 5
  title: text('title'),
  comment: text('comment').notNull(),
  speciesTreated: text('species_treated'), // cattle, poultry, goat, aqua, pet
  isVerifiedPurchase: boolean('is_verified_purchase').notNull().default(true),
  isVetRecommended: boolean('is_vet_recommended').notNull().default(false),
  helpfulCount: integer('helpful_count').notNull().default(0),
  isApproved: boolean('is_approved').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('product_reviews_product_idx').on(t.productId),
  index('product_reviews_user_idx').on(t.userId),
  index('product_reviews_rating_idx').on(t.rating),
  index('product_reviews_created_at_idx').on(t.createdAt),
]);
