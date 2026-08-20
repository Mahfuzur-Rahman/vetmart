// scripts/seed.ts
// Database seeder for VetMart BD (§17, §18)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import * as schema from '../lib/db/schema';

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = path.resolve('.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          return trimmed.replace('DATABASE_URL=', '').trim();
        }
      }
    }
  } catch {}
  return 'postgresql://postgres:postgres@localhost:5432/vetmart';
}

const DATABASE_URL = getDatabaseUrl();

async function seed() {
  console.log('🌱 Starting VetMart BD database seeding...');
  const sql = postgres(DATABASE_URL, { max: 1 });

  const db = drizzle(sql, { schema });

  // 1. Roles & Permissions (§14.1)
  console.log('1️⃣ Seeding Roles & Permissions...');
  const rolesData = [
    { key: 'super_admin', nameEn: 'Super Admin', nameBn: 'সুপার অ্যাডমিন', description: 'Full access to all system features' },
    { key: 'pharmacist', nameEn: 'Registered Pharmacist', nameBn: 'নিবন্ধিত ফার্মাসিস্ট', description: 'Prescription review & Rx orders' },
    { key: 'inventory', nameEn: 'Inventory Manager', nameBn: 'ইনভেন্টরি ম্যানেজার', description: 'Products, batches, stock adjustments' },
    { key: 'order_ops', nameEn: 'Order Operations', nameBn: 'অর্ডার অপারেশনস', description: 'Order processing & courier dispatch' },
    { key: 'content', nameEn: 'Content & CMS', nameBn: 'কনটেন্ট ও অনুবাদ', description: 'Banners, translations, categories' },
    { key: 'accounts', nameEn: 'Accounts', nameBn: 'হিসাব শাখা', description: 'Invoices, reports and payments' },
    { key: 'support', nameEn: 'Customer Support', nameBn: 'কাস্টমার সাপোর্ট', description: 'Customer inquiry and order view' },
  ];

  for (const r of rolesData) {
    await db.insert(schema.roles).values(r).onConflictDoNothing();
  }

  // Permission catalog + role grants (§14.1). These were never seeded, so the
  // permissions and role_permissions tables sat empty and every non-super-admin
  // role resolved to zero permissions.
  const permissionKeys = [
    'product.read', 'product.write',
    'stock.read', 'stock.adjust',
    'order.read', 'order.write', 'order.refund',
    'prescription.read', 'prescription.approve',
    'customer.read', 'customer.write',
    'settings.read', 'settings.write',
    'translation.write',
    'admin.manage',
  ];

  for (const key of permissionKeys) {
    await db.insert(schema.permissions).values({ key }).onConflictDoNothing();
  }

  // Super admin is resolved from the role assignment itself and needs no rows
  // here (see lib/auth/permissions.ts), so it is deliberately absent.
  const roleGrants: Record<string, string[]> = {
    pharmacist: ['product.read', 'order.read', 'prescription.read', 'prescription.approve', 'customer.read'],
    inventory: ['product.read', 'product.write', 'stock.read', 'stock.adjust', 'order.read'],
    order_ops: ['product.read', 'order.read', 'order.write', 'order.refund', 'customer.read', 'stock.read'],
    content: ['product.read', 'translation.write', 'settings.read'],
    accounts: ['order.read', 'product.read', 'settings.read'],
    support: ['order.read', 'customer.read', 'product.read'],
  };

  const allRoles = await db.select().from(schema.roles);
  const allPermissions = await db.select().from(schema.permissions);
  const roleIdByKey = new Map(allRoles.map((r) => [r.key, r.id]));
  const permissionIdByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

  for (const [roleKey, grants] of Object.entries(roleGrants)) {
    const roleId = roleIdByKey.get(roleKey);
    if (!roleId) continue;
    for (const permKey of grants) {
      const permissionId = permissionIdByKey.get(permKey);
      if (!permissionId) continue;
      await db
        .insert(schema.rolePermissions)
        .values({ roleId, permissionId })
        .onConflictDoNothing();
    }
  }

  // 2. BD Delivery Zones (§6, §14.2)
  console.log('2️⃣ Seeding BD Delivery Zones...');
  const zonesData = [
    { division: 'Dhaka', district: 'Dhaka', rate: 7000, etaDays: 1, coldChainEnabled: true }, // ৳70 inside Dhaka
    { division: 'Dhaka', district: 'Gazipur', rate: 10000, etaDays: 2, coldChainEnabled: true },
    { division: 'Dhaka', district: 'Narayanganj', rate: 10000, etaDays: 2, coldChainEnabled: true },
    { division: 'Chattogram', district: 'Chattogram', rate: 13000, etaDays: 3, coldChainEnabled: false }, // ৳130 outside Dhaka
    { division: 'Rajshahi', district: 'Bogura', rate: 13000, etaDays: 3, coldChainEnabled: false },
    { division: 'Rajshahi', district: 'Rajshahi', rate: 13000, etaDays: 3, coldChainEnabled: false },
    { division: 'Khulna', district: 'Khulna', rate: 13000, etaDays: 3, coldChainEnabled: false },
    { division: 'Mymensingh', district: 'Mymensingh', rate: 13000, etaDays: 3, coldChainEnabled: false },
    { division: 'Sylhet', district: 'Sylhet', rate: 13000, etaDays: 3, coldChainEnabled: false },
    { division: 'Rangpur', district: 'Rangpur', rate: 13000, etaDays: 3, coldChainEnabled: false },
    { division: 'Barishal', district: 'Barishal', rate: 13000, etaDays: 3, coldChainEnabled: false },
  ];

  for (const z of zonesData) {
    await db.insert(schema.deliveryZones).values(z).onConflictDoNothing();
  }

  // 3. Top Veterinary Manufacturers in Bangladesh (§5.2)
  console.log('3️⃣ Seeding Manufacturers...');
  const mfgList = [
    { name: 'Renata Animal Health', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_renata' },
    { name: 'ACI Animal Health', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_aci' },
    { name: 'Square Pharmaceuticals Ltd. (AgroVet)', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_square' },
    { name: 'SK+F Animal Health', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_skf' },
    { name: 'The ACME Laboratories Ltd. (Veterinary)', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_acme' },
    { name: 'Eon Animal Health', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_eon' },
    { name: 'Beximco Pharmaceuticals Ltd (Vet Division)', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_beximco' },
    { name: 'Renata Instrument Division', country: 'Bangladesh', logoPath: 'vetmart/seed/logo_renata' },
  ];

  const mfgMap = new Map<string, string>();
  for (const m of mfgList) {
    const [inserted] = await db
      .insert(schema.manufacturers)
      .values(m)
      .onConflictDoUpdate({ target: schema.manufacturers.name, set: { country: m.country, logoPath: m.logoPath } })
      .returning({ id: schema.manufacturers.id, name: schema.manufacturers.name });
    mfgMap.set(inserted.name, inserted.id);
  }

  // 4. Categories (§6)
  console.log('4️⃣ Seeding Categories...');
  const catList = [
    { slug: 'antibiotics', nameEn: 'Antibiotics & Antimicrobials', nameBn: 'অ্যান্টিবায়োটিক ও অ্যান্টিমাইক্রোবিয়াল', sort: 1, imagePath: 'vetmart/seed/cat_antibiotics' },
    { slug: 'vitamins-minerals', nameEn: 'Vitamins & Mineral Premix', nameBn: 'ভিটামিন ও মিনারেল প্রিমিক্স', sort: 2, imagePath: 'vetmart/seed/cat_vitamins' },
    { slug: 'anthelmintics', nameEn: 'Anthelmintics (Dewormers)', nameBn: 'কৃমিনাশক ওষুধ', sort: 3, imagePath: 'vetmart/seed/cat_anthelmintics' },
    { slug: 'feed-supplements', nameEn: 'Feed Supplements & Toxin Binders', nameBn: 'ফিড সাপ্লিমেন্ট ও টক্সিন বাইন্ডার', sort: 4, imagePath: 'vetmart/seed/cat_feed_supplements' },
    { slug: 'instruments', nameEn: 'Veterinary Instruments & AI', nameBn: 'চিকিৎসা সরঞ্জাম ও এআই যন্ত্রপাতি', sort: 5, imagePath: 'vetmart/seed/cat_instruments' },
    { slug: 'pet-care', nameEn: 'Pet Medicine & Nutrition', nameBn: 'পোষা প্রাণীর ওষুধ ও খাদ্য', sort: 6, imagePath: 'vetmart/seed/cat_pet_care' },
  ];

  const catMap = new Map<string, string>();
  for (const c of catList) {
    const [inserted] = await db
      .insert(schema.categories)
      .values(c)
      .onConflictDoUpdate({ target: schema.categories.slug, set: { nameEn: c.nameEn, nameBn: c.nameBn, imagePath: c.imagePath } })
      .returning({ id: schema.categories.id, slug: schema.categories.slug });
    catMap.set(inserted.slug, inserted.id);
  }

  // 5. Realistic Veterinary Products (§5.2, §17 - Bangladesh National Veterinary Formulary reference)
  console.log('5️⃣ Seeding Products with Batches and Stock Ledger...');
  const sampleProducts = [
    {
      slug: 'renaflox-100ml',
      sku: 'REN-ENRO-100',
      nameEn: 'Renaflox 100ml Oral Solution',
      nameBn: 'রেনাফ্লক্স ১০০মি.লি. ওরাল সলিউশন',
      genericName: 'Enrofloxacin 100 mg/ml',
      productType: 'drug_rx' as const,
      manufacturerId: mfgMap.get('Renata Animal Health'),
      categoryId: catMap.get('antibiotics'),
      strength: '100 mg/ml',
      strengthUnit: 'mg/ml',
      dosageForm: 'Oral Solution',
      packSize: '100 ml bottle',
      packUnit: 'bottle',
      targetSpecies: ['poultry', 'cattle', 'goat_sheep'],
      withdrawalMeatDays: 7,
      withdrawalMilkHours: 72,
      dgdaRegistrationNo: 'DAR-024-118-059',
      storageCondition: 'cool_dry' as const,
      requiresPrescription: true,
      requiresColdChain: true,
      isAntimicrobial: true,
      vatRate: '0.00',
      mrp: 18000, // ৳180.00
      salePrice: 16500, // ৳165.00
      banglishKeywords: 'renaflox enrofloxacin murgir oshudh gorur thanda cold chain',
      imageUrl: '/images/cal-d-mag.jpg',
    },
    {
      slug: 'rena-ws-100g',
      sku: 'REN-WS-100G',
      nameEn: 'Rena-WS 100g Soluble Powder',
      nameBn: 'রেনা-ডব্লিউএস ১০০গ্রাম পাউডার',
      genericName: 'Multivitamin with Essential Minerals',
      productType: 'drug_otc' as const,
      manufacturerId: mfgMap.get('Renata Animal Health'),
      categoryId: catMap.get('vitamins-minerals'),
      strength: 'Multi-vitamin complex',
      dosageForm: 'Soluble Powder',
      packSize: '100 g sachet',
      packUnit: 'sachet',
      targetSpecies: ['poultry', 'cattle', 'goat_sheep'],
      withdrawalMeatDays: 0,
      withdrawalMilkHours: 0,
      dgdaRegistrationNo: 'DAR-024-005-012',
      storageCondition: 'cool_dry' as const,
      requiresPrescription: false,
      requiresColdChain: false,
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 12000, // ৳120.00
      salePrice: 11000, // ৳110.00
      banglishKeywords: 'rena ws vitamin powder murgir dim barano nutrition boost',
      imageUrl: '/images/cal-d-mag.jpg',
    },
    {
      slug: 'acimec-1-injection-10ml',
      sku: 'ACM-IVM-10ML',
      nameEn: 'Acimec 1% Injection 10ml',
      nameBn: 'এসিমেক ১% ইনজেকশন ১০মি.লি.',
      genericName: 'Ivermectin 10 mg/ml (1% w/v)',
      productType: 'drug_rx' as const,
      manufacturerId: mfgMap.get('The ACME Laboratories Ltd. (Veterinary)'),
      categoryId: catMap.get('anthelmintics'),
      strength: '10 mg/ml',
      strengthUnit: 'mg/ml',
      dosageForm: 'Injection',
      packSize: '10 ml vial',
      packUnit: 'vial',
      targetSpecies: ['cattle', 'buffalo', 'goat_sheep', 'dog'],
      withdrawalMeatDays: 28,
      withdrawalMilkHours: 168,
      dgdaRegistrationNo: 'DAR-001-342-019',
      storageCondition: 'room_temp' as const,
      requiresPrescription: true,
      requiresColdChain: false,
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 14500, // ৳145.00
      salePrice: 13500, // ৳135.00
      banglishKeywords: 'acimec ivermectin kriminashok gorur chulkani parasite control',
      imageUrl: '/images/cal-d-mag.jpg',
    },
    {
      slug: 'eon-cal-p-1L',
      sku: 'EON-CALP-1L',
      nameEn: 'Eon Cal-P 1 Liter Liquid',
      nameBn: 'ইয়ন ক্যাল-পি ১ লিটার লিকুইড',
      genericName: 'Calcium, Phosphorus & Vitamin D3',
      productType: 'feed_supplement' as const,
      manufacturerId: mfgMap.get('Eon Animal Health'),
      categoryId: catMap.get('feed-supplements'),
      strength: 'High-potency ionic Liquid Calcium',
      dosageForm: 'Oral Liquid',
      packSize: '1 Liter bottle',
      packUnit: 'bottle',
      targetSpecies: ['cattle', 'goat_sheep'],
      withdrawalMeatDays: 0,
      withdrawalMilkHours: 0,
      dgdaRegistrationNo: 'DAR-088-112-004',
      storageCondition: 'room_temp' as const,
      requiresPrescription: false,
      requiresColdChain: false,
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 48000,
      salePrice: 45000,
      banglishKeywords: 'eon cal p calcium liquid dudh barano milk booster',
      imageUrl: '/images/cal-d-mag.jpg',
    },
    {
      slug: 'square-vet-c-500g',
      sku: 'SQ-VETC-500G',
      nameEn: 'Square Vet-C 99% Powder 500g',
      nameBn: 'স্কয়ার ভেট-সি ৯৯% পাউডার ৫০০গ্রাম',
      genericName: 'Ascorbic Acid (Pure Vitamin C 99%)',
      productType: 'feed_supplement' as const,
      manufacturerId: mfgMap.get('Square Pharmaceuticals Ltd. (AgroVet)'),
      categoryId: catMap.get('feed-supplements'),
      strength: '99% Pure Ascorbic Acid',
      dosageForm: 'Powder',
      packSize: '500 g pack',
      packUnit: 'pack',
      targetSpecies: ['poultry'],
      withdrawalMeatDays: 0,
      withdrawalMilkHours: 0,
      dgdaRegistrationNo: 'DAR-002-990-101',
      storageCondition: 'room_temp' as const,
      requiresPrescription: false,
      requiresColdChain: false,
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 35000,
      salePrice: 32000,
      banglishKeywords: 'vet c vitamin c heat stress murgir gorom lagle',
      imageUrl: '/images/cal-d-mag.jpg',
    },
    {
      slug: 'petcare-shampoo-kit',
      sku: 'PET-SHAMP-KIT',
      nameEn: 'PetCare Herbal Anti-Tick Shampoo Kit',
      nameBn: 'পেটকেয়ার ভেষজ অ্যান্টি-টিক শ্যাম্পু কিট',
      genericName: 'Herbal Neem & Permethrin Pet Cleanser',
      productType: 'pet_food' as const,
      manufacturerId: mfgMap.get('ACI Animal Health'),
      categoryId: catMap.get('pet-care'),
      strength: 'Herbal tick & flea protection',
      dosageForm: 'Liquid Shampoo',
      packSize: '250 ml bottle + comb',
      packUnit: 'kit',
      targetSpecies: ['dog', 'cat', 'pet'],
      withdrawalMeatDays: 0,
      withdrawalMilkHours: 0,
      dgdaRegistrationNo: 'DAR-044-881-002',
      storageCondition: 'room_temp' as const,
      requiresPrescription: false,
      requiresColdChain: false,
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 95000,
      salePrice: 89000,
      banglishKeywords: 'pet shampoo dog shampoo cat shampoo anti tick',
      imageUrl: '/images/cal-d-mag.jpg',
    },
    {
      slug: 'vet-ai-gun-french',
      sku: 'INST-AIGUN-FR',
      nameEn: 'Veterinary French AI Gun Stainless Steel',
      nameBn: 'ভেটেরিনারি এআই গান (কৃত্রিম প্রজনন গান)',
      genericName: 'Universal 0.25ml & 0.5ml Straw AI Applicator',
      productType: 'instrument' as const,
      manufacturerId: mfgMap.get('Renata Instrument Division'),
      categoryId: catMap.get('instruments'),
      strength: 'Medical grade 304 Stainless Steel',
      dosageForm: 'Instrument',
      packSize: '1 Set',
      packUnit: 'set',
      targetSpecies: ['cattle', 'goat_sheep'],
      withdrawalMeatDays: 0,
      withdrawalMilkHours: 0,
      dgdaRegistrationNo: 'DAR-INST-001',
      storageCondition: 'room_temp' as const,
      requiresPrescription: false,
      requiresColdChain: false,
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 140000,
      salePrice: 125000,
      banglishKeywords: 'ai gun artificial insemination gorur bij debar gun',
      imageUrl: '/images/cal-d-mag.jpg',
    },
    {
      slug: 'beximco-cal-d-mag-plus-vet-liquid-1l',
      sku: 'BEX-CALDMAG-1L',
      nameEn: 'Beximco Cal-D-Mag Plus Vet Liquid 1L',
      nameBn: 'বেক্সিমকো ক্যাল-ডি-ম্যাগ প্লাস ভেট লিকুইড ১ লিটার',
      genericName: 'Calcium, Magnesium, Zinc & Vitamin D3',
      productType: 'feed_supplement' as const,
      manufacturerId: mfgMap.get('Beximco Pharmaceuticals Ltd (Vet Division)'),
      categoryId: catMap.get('vitamins-minerals'),
      strength: 'Ionic Liquid Calcium + Magnesium',
      dosageForm: 'Oral Solution',
      packSize: '1 Liter Bottle',
      packUnit: 'bottle',
      targetSpecies: ['cattle', 'poultry', 'goat_sheep'],
      withdrawalMeatDays: 0,
      withdrawalMilkHours: 0,
      dgdaRegistrationNo: 'DAR-012-441-098',
      storageCondition: 'room_temp' as const,
      requiresPrescription: false,
      requiresColdChain: false,
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 52000,
      salePrice: 47500,
      banglishKeywords: 'beximco cal d mag calcium magnesium dudh barano milk fever',
      imageUrl: '/images/cal-d-mag.jpg',
    },
  ];

  for (const prodData of sampleProducts) {
    const { imageUrl: prodImg, ...prod } = prodData;
    const [insertedProd] = await db
      .insert(schema.products)
      .values(prod)
      .onConflictDoUpdate({ target: schema.products.slug, set: prod })
      .returning({ id: schema.products.id, nameEn: schema.products.nameEn });

    // Create a batch expiring in 18 months
    const mfgDate = new Date();
    mfgDate.setMonth(mfgDate.getMonth() - 2);
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 16);

    const [batch] = await db
      .insert(schema.productBatches)
      .values({
        productId: insertedProd.id,
        batchNo: `B-${Math.floor(1000 + Math.random() * 9000)}`,
        mfgDate,
        expiryDate,
        qtyReceived: 500,
        costPrice: Math.round(prod.salePrice * 0.75),
        supplierId: 'Primary Distributor',
      })
      .returning();

    // Record opening stock in stock_ledger (§2 rule 3)
    await db.insert(schema.stockLedger).values({
      productId: insertedProd.id,
      batchId: batch.id,
      delta: 500,
      reason: 'purchase',
      refType: 'initial_seed',
      refId: batch.batchNo,
    });

    // Seed product images
    await db.insert(schema.productImages)
      .values({
        productId: insertedProd.id,
        basePath: prodImg || '/images/cal-d-mag.jpg',
        altEn: prod.nameEn,
        altBn: prod.nameBn,
        sort: 1,
      })
      .onConflictDoNothing();
  }


  // 5b. Seeding Homepage Banners
  console.log('5b️⃣ Seeding Homepage Banners...');
  await db.insert(schema.homepageSections)
    .values({
      type: 'hero_slider',
      sort: 1,
      isActive: true,
      config: {
        slides: [
          {
            imagePath: 'vetmart/seed/hero_1', 
            titleEn: 'Premium Animal Health Products',
            titleBn: 'উন্নত মানের পশুর ওষুধ',
            link: '/shop'
          },
          {
            imagePath: 'vetmart/seed/hero_2',
            titleEn: 'Complete Pet Care',
            titleBn: 'পোষা প্রাণীর সম্পূর্ণ যত্ন',
            link: '/category/pet-care'
          }
        ]
      }
    })
    .onConflictDoNothing();

  // 6. Users & Admins (§8, §14.1)
  console.log('6️⃣ Seeding Users & Admins...');
  
  // Custom hash function for seeding (matches lib/auth/hash.ts pbkdf2 with salt 'seed_salt')
  // We'll just insert simple hashes for demo since this is a seeded script, or we can use the actual hash function.
  // Actually, we'll import hashPassword and hashOtp directly.
  const { hashPassword, hashOtp } = await import('../lib/auth/hash');

  const superAdminRole = await db.query.roles.findFirst({ where: (r, { eq }) => eq(r.key, 'super_admin') });
  const inventoryRole = await db.query.roles.findFirst({ where: (r, { eq }) => eq(r.key, 'inventory') });

  if (superAdminRole && inventoryRole) {
    // Superadmin
    const [sa] = await db.insert(schema.admins).values({
      email: 'superadmin@vetmart.bd',
      name: 'Superadmin (DB)',
      passwordHash: hashPassword('Super123!'),
      isActive: true,
    }).onConflictDoNothing().returning();

    if (sa) {
      await db.insert(schema.adminRoles).values({
        adminId: sa.id,
        roleId: superAdminRole.id,
      }).onConflictDoNothing();
    }

    // Admin (Limited Access)
    const [ad] = await db.insert(schema.admins).values({
      email: 'admin@vetmart.bd',
      name: 'Admin (DB)',
      passwordHash: hashPassword('Admin123!'),
      isActive: true,
    }).onConflictDoNothing().returning();

    if (ad) {
      await db.insert(schema.adminRoles).values({
        adminId: ad.id,
        roleId: inventoryRole.id,
      }).onConflictDoNothing();
    }
  }

  // Demo Customer
  await db.insert(schema.users).values({
    phone: '01711000000',
    name: 'Dr. Anisur Rahman',
    email: 'anisur@vetmart.bd',
    passwordHash: hashPassword('Customer123!'),
    tier: 'vet',
    isVerifiedVet: true,
    bvcRegNo: 'BVC-REG-10492',
    isActive: true,
  }).onConflictDoNothing();

  console.log('✅ VetMart BD seeding finished successfully!');
  await sql.end();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
