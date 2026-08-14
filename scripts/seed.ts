// scripts/seed.ts
// Database seeder for VetMart BD (§17, §18)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vetmart';

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
      nameEn: 'Renaflox Oral Solution',
      nameBn: 'রেনাফ্লক্স ওরাল সলিউশন',
      genericName: 'Enrofloxacin',
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
      isAntimicrobial: true,
      vatRate: '0.00',
      mrp: 18000, // ৳180.00
      salePrice: 16500, // ৳165.00
      banglishKeywords: 'renaflox enrofloxacin murgir oshudh gorur thanda',
    },
    {
      slug: 'rena-ws-100g',
      sku: 'REN-WS-100G',
      nameEn: 'Rena-WS Water Soluble Powder',
      nameBn: 'রেনা-ডব্লিউএস পাউডার',
      genericName: 'Multivitamin with Minerals',
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
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 12000, // ৳120.00
      salePrice: 11000, // ৳110.00
      banglishKeywords: 'rena ws vitamin powder murgir dim barano',
    },
    {
      slug: 'acimec-1-injection-10ml',
      sku: 'ACM-IVM-10ML',
      nameEn: 'Acimec 1% Injection',
      nameBn: 'এসিমেক ১% ইনজেকশন',
      genericName: 'Ivermectin',
      productType: 'drug_rx' as const,
      manufacturerId: mfgMap.get('The ACME Laboratories Ltd. (Veterinary)'),
      categoryId: catMap.get('anthelmintics'),
      strength: '10 mg/ml (1% w/v)',
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
      isAntimicrobial: false,
      vatRate: '0.00',
      mrp: 14500, // ৳145.00
      salePrice: 13500, // ৳135.00
      banglishKeywords: 'acimec ivermectin kriminashok gorur chulkani',
    },
  ];

  for (const prod of sampleProducts) {
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
    let imageKey = 'vetmart/seed/cat_vitamins';
    if (prod.slug === 'renaflox-100ml') imageKey = 'vetmart/seed/prod_renaflox';
    if (prod.slug === 'rena-ws-100g') imageKey = 'vetmart/seed/prod_renaws'; 
    if (prod.slug === 'acimec-1-injection-10ml') imageKey = 'vetmart/seed/prod_acimec'; 

    await db.insert(schema.productImages)
      .values({
        productId: insertedProd.id,
        basePath: imageKey,
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
