// lib/mock-data/products.ts
// Embedded dynamic SVG artwork generators for high-craft visual rendering without external image dependencies

function createProductSvg(title: string, color: string, badge: string, subtitle: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#059669"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#bg)" rx="16"/>
    <circle cx="200" cy="180" r="130" fill="url(#accent)" opacity="0.15"/>
    <!-- Bottle / Bottle Container Vector -->
    <rect x="140" y="90" width="120" height="200" rx="20" fill="#1e293b" stroke="${color}" stroke-width="4"/>
    <rect x="170" y="65" width="60" height="30" rx="6" fill="${color}"/>
    <rect x="150" y="140" width="100" height="120" rx="8" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    
    <!-- Badge -->
    <rect x="160" y="152" width="80" height="22" rx="11" fill="${color}"/>
    <text x="200" y="167" fill="#ffffff" font-size="11" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${badge}</text>
    
    <!-- Labels -->
    <text x="200" y="198" fill="#f8fafc" font-size="13" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">${title}</text>
    <text x="200" y="218" fill="#94a3b8" font-size="10" font-family="system-ui, sans-serif" text-anchor="middle">${subtitle}</text>
    <text x="200" y="240" fill="#10b981" font-size="11" font-weight="bold" font-family="system-ui, sans-serif" text-anchor="middle">VetMart BD Verified</text>
    
    <!-- Footer Brand Seal -->
    <text x="200" y="345" fill="#e2e8f0" font-size="14" font-weight="800" font-family="system-ui, sans-serif" text-anchor="middle" letter-spacing="1">VETMART BD</text>
    <text x="200" y="365" fill="#64748b" font-size="11" font-family="system-ui, sans-serif" text-anchor="middle">ANIMAL HEALTH FORMULARY</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface MockProduct {
  id: string;
  slug: string;
  sku: string;
  nameEn: string;
  nameBn: string;
  genericName: string;
  categorySlug: string;
  categoryNameEn: string;
  categoryNameBn: string;
  manufacturerName: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  packUnit: string;
  targetSpecies: string[];
  mrp: number; // in integer paisa (e.g. 18000 = ৳180.00)
  salePrice: number; // in integer paisa
  vetPrice?: number;
  requiresPrescription: boolean;
  requiresColdChain: boolean;
  isAntimicrobial: boolean;
  coldChain: boolean;
  dgdaRegNo: string;
  batchNo: string;
  expiryDate: string;
  mfgDate: string;
  stockQty: number;
  imageUrl: string;
  banglishKeywords: string;
  descriptionEn: string;
  descriptionBn: string;
  dosageEn: string;
  dosageBn: string;
}

export const SEED_PRODUCTS: MockProduct[] = [
  {
    id: 'prod-1',
    slug: 'renaflox-100ml',
    sku: 'REN-ENRO-100',
    nameEn: 'Renaflox 100ml Oral Solution',
    nameBn: 'রেনাফ্লক্স ১০০মি.লি. ওরাল সলিউশন',
    genericName: 'Enrofloxacin 100 mg/ml',
    categorySlug: 'antibiotics',
    categoryNameEn: 'Antibiotics & Antimicrobials',
    categoryNameBn: 'অ্যান্টিবায়োটিক ওষুধ',
    manufacturerName: 'Renata Animal Health',
    strength: '100 mg/ml',
    dosageForm: 'Oral Solution',
    packSize: '100 ml bottle',
    packUnit: 'bottle',
    targetSpecies: ['poultry', 'cattle', 'goat-sheep'],
    mrp: 18000, // ৳180.00
    salePrice: 16500, // ৳165.00
    vetPrice: 15000, // ৳150.00 for registered vets
    requiresPrescription: true,
    requiresColdChain: true,
    isAntimicrobial: true,
    coldChain: true,
    dgdaRegNo: 'DAR-024-118-059',
    batchNo: 'B-REN-8912',
    mfgDate: '2026-01-15',
    expiryDate: '2027-12-30',
    stockQty: 450,
    imageUrl: createProductSvg('RENAFLOX', '#10b981', 'Rx Antibiotic', 'Enrofloxacin 100ml'),
    banglishKeywords: 'renaflox enrofloxacin murgir oshudh gorur thanda cold chain',
    descriptionEn: 'High-efficacy broad-spectrum fluoroquinolone antimicrobial for CRD, Colibacillosis, and Salmonellosis in poultry and ruminants.',
    descriptionBn: 'পোল্ট্রি ও গবাদি পশুর সিআরডি, কলিব্যাসিলোসিস এবং সালমনেলোসিস চিকিৎসায় ব্যবহৃত উচ্চ ক্ষমতাসম্পন্ন অ্যান্টিরোফ্লক্সাসিন প্রিপারেশন।',
    dosageEn: 'Poultry: 1 ml per 1-2 Liters of drinking water for 3-5 days.',
    dosageBn: 'পোল্ট্রি: ১ মি.লি. প্রতি ১-২ লিটার খাবার পানিতে মিশিয়ে ৩-৫ দিন।',
  },
  {
    id: 'prod-2',
    slug: 'rena-ws-100g',
    sku: 'REN-WS-100G',
    nameEn: 'Rena-WS 100g Soluble Powder',
    nameBn: 'রেনা-ডব্লিউএস ১০০গ্রাম পাউডার',
    genericName: 'Multivitamin with Essential Minerals',
    categorySlug: 'vitamins-minerals',
    categoryNameEn: 'Vitamins & Mineral Premix',
    categoryNameBn: 'ভিটামিন ও মিনারেল প্রিমিক্স',
    manufacturerName: 'Renata Animal Health',
    strength: 'Multi-vitamin complex',
    dosageForm: 'Soluble Powder',
    packSize: '100 g sachet',
    packUnit: 'sachet',
    targetSpecies: ['poultry', 'cattle', 'goat-sheep'],
    mrp: 12000,
    salePrice: 11000,
    vetPrice: 10000,
    requiresPrescription: false,
    requiresColdChain: false,
    isAntimicrobial: false,
    coldChain: false,
    dgdaRegNo: 'DAR-024-005-012',
    batchNo: 'B-RWS-4410',
    mfgDate: '2026-02-01',
    expiryDate: '2028-04-15',
    stockQty: 820,
    imageUrl: createProductSvg('RENA-WS', '#f59e0b', 'Vitamin Boost', '100g Soluble Premix'),
    banglishKeywords: 'rena ws vitamin powder murgir dim barano nutrition boost',
    descriptionEn: 'Balanced multivitamin concentrate for rapid recovery from stress, vaccination, and egg production optimization.',
    descriptionBn: 'পোল্ট্রি ও গবাদি পশুর স্ট্রেস রিকভারি, ডিম উৎপাদন বৃদ্ধি এবং রোগ প্রতিরোধ ক্ষমতা বাড়াতে অত্যন্ত কার্যকরী।',
    dosageEn: '1 g per 2 Liters of drinking water for 5 consecutive days.',
    dosageBn: '১ গ্রাম প্রতি ২ লিটার খাবার পানিতে মিশিয়ে ৫ দিন খাওয়াতে হবে।',
  },
  {
    id: 'prod-3',
    slug: 'acimec-1-injection-10ml',
    sku: 'ACM-IVM-10ML',
    nameEn: 'Acimec 1% Injection 10ml',
    nameBn: 'এসিমেক ১% ইনজেকশন ১০মি.লি.',
    genericName: 'Ivermectin 10 mg/ml (1% w/v)',
    categorySlug: 'anthelmintics',
    categoryNameEn: 'Anthelmintics (Dewormers)',
    categoryNameBn: 'কৃমিনাশক ওষুধ',
    manufacturerName: 'The ACME Laboratories Ltd.',
    strength: '10 mg/ml',
    dosageForm: 'Injection',
    packSize: '10 ml vial',
    packUnit: 'vial',
    targetSpecies: ['cattle', 'goat-sheep', 'pet'],
    mrp: 14500,
    salePrice: 13500,
    vetPrice: 12000,
    requiresPrescription: true,
    requiresColdChain: false,
    isAntimicrobial: false,
    coldChain: false,
    dgdaRegNo: 'DAR-001-342-019',
    batchNo: 'B-ACM-2201',
    mfgDate: '2026-01-10',
    expiryDate: '2027-09-30',
    stockQty: 310,
    imageUrl: createProductSvg('ACIMEC 1%', '#6366f1', 'Dewormer Rx', 'Ivermectin 10ml Injection'),
    banglishKeywords: 'acimec ivermectin kriminashok gorur chulkani parasite control',
    descriptionEn: 'Injectable endectocide for the control of internal roundworms, lungworms, and external parasites (ticks, mites, lice).',
    descriptionBn: 'গরু, ছাগল ও পোষা প্রাণীর শরীরের অভ্যন্তরীণ কৃমি এবং বাহ্যিক পরজীবী (আটালী, উকুন, মাইট) দমনে ইনজেকশন।',
    dosageEn: '1 ml per 50 kg body weight subcutaneously.',
    dosageBn: 'প্রতি ৫০ কেজি শারীরিক ওজনের জন্য ১ মি.লি. চামড়ার নিচে ইনজেকশন দিতে হবে।',
  },
  {
    id: 'prod-4',
    slug: 'eon-cal-p-1L',
    sku: 'EON-CALP-1L',
    nameEn: 'Eon Cal-P 1 Liter Liquid',
    nameBn: 'ইয়ন ক্যাল-পি ১ লিটার লিকুইড',
    genericName: 'Calcium, Phosphorus & Vitamin D3',
    categorySlug: 'feed-supplements',
    categoryNameEn: 'Feed Supplements & Toxin Binders',
    categoryNameBn: 'ফিড সাপ্লিমেন্ট',
    manufacturerName: 'Eon Animal Health',
    strength: 'High-potency ionic Liquid Calcium',
    dosageForm: 'Oral Liquid',
    packSize: '1 Liter bottle',
    packUnit: 'bottle',
    targetSpecies: ['cattle', 'goat-sheep'],
    mrp: 48000,
    salePrice: 45000,
    vetPrice: 42000,
    requiresPrescription: false,
    requiresColdChain: false,
    isAntimicrobial: false,
    coldChain: false,
    dgdaRegNo: 'DAR-088-112-004',
    batchNo: 'B-EON-9901',
    mfgDate: '2026-02-10',
    expiryDate: '2027-11-20',
    stockQty: 190,
    imageUrl: createProductSvg('CAL-P LIQUID', '#06b6d4', 'High Calcium', '1 Liter Dairy Boost'),
    banglishKeywords: 'eon cal p calcium liquid dudh barano milk booster gorur har shokto',
    descriptionEn: 'Premium oral calcium supplement designed to boost milk yield, prevent milk fever, and enhance bone strength in lactating cows.',
    descriptionBn: 'দুগ্ধবতী গাভীর দুধের পরিমাণ বৃদ্ধি, মিল্ক ফিভার প্রতিরোধ ও হাড়ের সুস্থতায় উন্নতমানের তরল ক্যালসিয়াম প্রিপারেশন।',
    dosageEn: '100 ml daily for dairy cows; 20-30 ml daily for goats.',
    dosageBn: 'গাভী: ১০০ মি.লি. দৈনিক; ছাগল/ভেড়া: ২০-৩০ মি.লি. দৈনিক।',
  },
  {
    id: 'prod-5',
    slug: 'square-vet-c-500g',
    sku: 'SQ-VETC-500G',
    nameEn: 'Square Vet-C 99% Powder 500g',
    nameBn: 'স্কয়ার ভেট-সি ৯৯% পাউডার ৫০০গ্রাম',
    genericName: 'Ascorbic Acid (Pure Vitamin C 99%)',
    categorySlug: 'feed-supplements',
    categoryNameEn: 'Feed Supplements & Toxin Binders',
    categoryNameBn: 'ফিড সাপ্লিমেন্ট',
    manufacturerName: 'Square Pharmaceuticals Ltd. (AgroVet)',
    strength: '99% Pure Ascorbic Acid',
    dosageForm: 'Powder',
    packSize: '500 g pack',
    packUnit: 'pack',
    targetSpecies: ['poultry', 'aqua'],
    mrp: 35000,
    salePrice: 32000,
    vetPrice: 30000,
    requiresPrescription: false,
    requiresColdChain: false,
    isAntimicrobial: false,
    coldChain: false,
    dgdaRegNo: 'DAR-002-990-101',
    batchNo: 'B-SQC-1102',
    mfgDate: '2026-01-20',
    expiryDate: '2028-01-10',
    stockQty: 540,
    imageUrl: createProductSvg('SQUARE VET-C', '#ec4899', 'Anti-Stress C', '500g 99% Vitamin C'),
    banglishKeywords: 'vet c vitamin c heat stress murgir gorom lagle anti stress',
    descriptionEn: 'High-purity anti-stress vitamin C premix to prevent heat stroke and stress mortality in poultry during hot summer months.',
    descriptionBn: 'গরমের দিনে হাঁস-মুরগির হিট স্ট্রোক প্রতিরোধ এবং রোগ প্রতিরোধ ক্ষমতা সুদৃঢ় রাখতে ৯৯% বিশুদ্ধ ভিটামিন সি।',
    dosageEn: '1 g per 5 Liters of water during heat stress.',
    dosageBn: 'প্রচণ্ড গরমে ১ গ্রাম প্রতি ৫ লিটার পানিতে মিশিয়ে দিতে হবে।',
  },
  {
    id: 'prod-6',
    slug: 'petcare-shampoo-kit',
    sku: 'PET-SHAMP-KIT',
    nameEn: 'PetCare Herbal Anti-Tick Shampoo Kit',
    nameBn: 'পেটকেয়ার ভেষজ অ্যান্টি-টিক শ্যাম্পু কিট',
    genericName: 'Herbal Neem & Permethrin Pet Cleanser',
    categorySlug: 'pet-care',
    categoryNameEn: 'Pet Medicine & Nutrition',
    categoryNameBn: 'পোষা প্রাণীর ওষুধ ও যত্ন',
    manufacturerName: 'ACI Animal Health',
    strength: 'Herbal tick & flea protection',
    dosageForm: 'Liquid Shampoo',
    packSize: '250 ml bottle + comb',
    packUnit: 'kit',
    targetSpecies: ['pet'],
    mrp: 95000,
    salePrice: 89000,
    vetPrice: 82000,
    requiresPrescription: false,
    requiresColdChain: false,
    isAntimicrobial: false,
    coldChain: false,
    dgdaRegNo: 'DAR-044-881-002',
    batchNo: 'B-PET-5501',
    mfgDate: '2026-02-05',
    expiryDate: '2028-06-30',
    stockQty: 140,
    imageUrl: createProductSvg('PETCARE SHAMPOO', '#8b5cf6', 'Anti-Tick Kit', '250ml Herbal Pet Care'),
    banglishKeywords: 'pet shampoo dog shampoo cat shampoo anti tick flea dog care',
    descriptionEn: 'Gentle pH-balanced anti-flea and tick grooming shampoo with natural neem conditioning oil for dogs and cats.',
    descriptionBn: 'কুকুর ও বিড়ালের গায়ের উকুন, আটালী দমনে এবং পশম উজ্জ্বল রাখতে প্রাকৃতিক নিম সমৃদ্ধ ভেষজ শ্যাম্পু।',
    dosageEn: 'Apply on wet coat, lather thoroughly for 5 minutes, rinse completely with clean water.',
    dosageBn: 'ভিজা পশমে লাগিয়ে ৫ মিনিট ফেনা রেখে পরিষ্কার পানি দিয়ে ধুয়ে ফেলুন।',
  },
  {
    id: 'prod-7',
    slug: 'vet-ai-gun-french',
    sku: 'INST-AIGUN-FR',
    nameEn: 'Veterinary French AI Gun Stainless Steel',
    nameBn: 'ভেটেরিনারি এআই গান (কৃত্রিম প্রজনন গান)',
    genericName: 'Universal 0.25ml & 0.5ml Straw AI Applicator',
    categorySlug: 'instruments',
    categoryNameEn: 'Veterinary Instruments & AI',
    categoryNameBn: 'চিকিৎসা সরঞ্জাম ও এআই',
    manufacturerName: 'Renata Instrument Division',
    strength: 'Medical grade 304 Stainless Steel',
    dosageForm: 'Instrument',
    packSize: '1 Set (Gun + Sheath Pack)',
    packUnit: 'set',
    targetSpecies: ['cattle', 'goat-sheep'],
    mrp: 140000,
    salePrice: 125000,
    vetPrice: 115000,
    requiresPrescription: false,
    requiresColdChain: false,
    isAntimicrobial: false,
    coldChain: false,
    dgdaRegNo: 'DAR-INST-001',
    batchNo: 'B-INS-1002',
    mfgDate: '2026-01-01',
    expiryDate: '2031-12-31',
    stockQty: 85,
    imageUrl: createProductSvg('AI GUN SET', '#f43f5e', 'Vet Instrument', 'Universal French Gun'),
    banglishKeywords: 'ai gun artificial insemination gorur bij debar gun vet equipment',
    descriptionEn: 'Precision-engineered stainless steel artificial insemination applicator compatible with both 0.25 ml and 0.5 ml French straws.',
    descriptionBn: 'গরু ও ছাগলের কৃত্রিম প্রজনন (এআই) কাজের জন্য স্টেইনলেস স্টিলের ইউনিভার্সাল এআই গান।',
    dosageEn: 'For clinical use by certified AI technicians and registered veterinarians.',
    dosageBn: 'শুধুমাত্র নিবন্ধিত ভেটেরিনারি সার্জন ও সার্টিফাইড এআই টেকনিশিয়ানদের ব্যবহারের জন্য।',
  },
  {
    id: 'prod-8',
    slug: 'beximco-cal-d-mag-plus-vet-liquid-1l',
    sku: 'BEX-CALDMAG-1L',
    nameEn: 'Beximco Cal-D-Mag Plus Vet Liquid 1L',
    nameBn: 'বেক্সিমকো ক্যাল-ডি-ম্যাগ প্লাস ভেট লিকুইড ১ লিটার',
    genericName: 'Calcium, Magnesium, Zinc & Vitamin D3',
    categorySlug: 'vitamins-minerals',
    categoryNameEn: 'Vitamins & Mineral Premix',
    categoryNameBn: 'ভিটামিন ও খনিজ',
    manufacturerName: 'Beximco Pharmaceuticals Ltd (Vet Division)',
    strength: 'Ionic Liquid Calcium + Magnesium Fortified',
    dosageForm: 'Oral Solution',
    packSize: '1 Liter Bottle',
    packUnit: 'bottle',
    targetSpecies: ['cattle', 'poultry', 'goat-sheep'],
    mrp: 52000, // ৳520.00
    salePrice: 47500, // ৳475.00
    vetPrice: 44000, // ৳440.00
    requiresPrescription: false,
    requiresColdChain: false,
    isAntimicrobial: false,
    coldChain: false,
    dgdaRegNo: 'DAR-012-441-098',
    batchNo: 'B-BEX-9042',
    mfgDate: '2026-01-10',
    expiryDate: '2028-06-30',
    stockQty: 320,
    imageUrl: createProductSvg('CAL-D-MAG', '#8b5cf6', 'Dairy Calcium', '1 Liter Fortified Liquid'),
    banglishKeywords: 'beximco cal d mag calcium magnesium dudh barano milk fever dairy tonic',
    descriptionEn: 'High-absorption liquid calcium and magnesium formula with Vitamin D3 to maximize milk production, strengthen bones, and prevent hypocalcemia.',
    descriptionBn: 'দুগ্ধবতী গাভীর দুধের ঘাটতি পূরণ, মিল্ক ফিভার প্রতিরোধ এবং হাড়ের সুরক্ষায় উচ্চ ক্ষমতাসম্পন্ন তরল ক্যালসিয়াম ও ম্যাগনেসিয়াম ফর্মুলা।',
    dosageEn: 'Cattle: 100-150 ml daily for 7-10 days; Sheep/Goat: 20-30 ml daily.',
    dosageBn: 'গাভী: ১০০-১৫০ মি.লি. দৈনিক ৭-১০ দিন; ছাগল/ভেড়া: ২০-৩০ মি.লি. দৈনিক।',
  },
];

// Empty active catalog so testers can test each product creation, update, and deletion cleanly
export const MOCK_PRODUCTS: MockProduct[] = [];

export const STORAGE_KEY = 'vetmart_custom_products';
export const DELETED_KEY = 'vetmart_deleted_product_ids';
export const PRODUCTS_UPDATED_EVENT = 'vetmart_products_updated';

export function getProductBySlug(slug: string): MockProduct | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  return (
    MOCK_PRODUCTS.find((p) => p.slug.toLowerCase() === normalized || p.id.toLowerCase() === normalized) ||
    MOCK_PRODUCTS.find((p) => p.slug.toLowerCase().includes(normalized) || normalized.includes(p.slug.toLowerCase()))
  );
}

export function searchProducts(query: string): MockProduct[] {
  if (!query || query.trim() === '') return MOCK_PRODUCTS;
  const q = query.toLowerCase().trim();
  return MOCK_PRODUCTS.filter(
    (p) =>
      p.nameEn.toLowerCase().includes(q) ||
      p.nameBn.toLowerCase().includes(q) ||
      p.genericName.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.banglishKeywords.toLowerCase().includes(q)
  );
}

/**
 * Retrieves the live merged products array in client context,
 * incorporating custom added/edited items and filtering out deleted IDs/slugs.
 */
export function getStoredProducts(): MockProduct[] {
  if (typeof localStorage === 'undefined') {
    return MOCK_PRODUCTS;
  }

  try {
    const deletedRaw = localStorage.getItem(DELETED_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    const deletedSet = new Set(deletedIds);

    const stored = localStorage.getItem(STORAGE_KEY);
    let combined: MockProduct[] = [...MOCK_PRODUCTS];

    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const customMap = new Map(parsed.map((p: MockProduct) => [p.id, p]));
        const nonOverriddenMocks = MOCK_PRODUCTS.filter((p) => !customMap.has(p.id));
        combined = [...parsed, ...nonOverriddenMocks];
      }
    }

    if (deletedSet.size > 0) {
      combined = combined.filter((p) => !deletedSet.has(p.id) && !deletedSet.has(p.slug));
    }

    return combined;
  } catch (err) {
    console.error('Failed to get stored products:', err);
    return MOCK_PRODUCTS;
  }
}

/**
 * Retrieve a specific product by slug or id taking into account localStorage.
 */
export function getStoredProductBySlug(slug: string): MockProduct | undefined {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase().trim();
  const all = getStoredProducts();
  return (
    all.find((p) => p.slug.toLowerCase() === normalized || p.id.toLowerCase() === normalized) ||
    all.find((p) => p.slug.toLowerCase().includes(normalized) || normalized.includes(p.slug.toLowerCase()))
  );
}

/**
 * Check if a product ID or slug is marked deleted in client storage.
 */
export function isProductDeleted(idOrSlug: string): boolean {
  if (typeof localStorage === 'undefined' || !idOrSlug) return false;
  try {
    const deletedRaw = localStorage.getItem(DELETED_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    const set = new Set(deletedIds);
    return set.has(idOrSlug);
  } catch {
    return false;
  }
}

/**
 * Persist an added or edited custom product in client storage and broadcast update.
 */
export function saveStoredCustomProduct(product: MockProduct): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let list: MockProduct[] = stored ? JSON.parse(stored) : [];
    const index = list.findIndex((p) => p.id === product.id || p.slug === product.slug);
    if (index >= 0) {
      list[index] = product;
    } else {
      list = [product, ...list];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    // Remove from deleted IDs if previously marked deleted
    const deletedRaw = localStorage.getItem(DELETED_KEY);
    if (deletedRaw) {
      const deletedIds: string[] = JSON.parse(deletedRaw);
      const filtered = deletedIds.filter((id) => id !== product.id && id !== product.slug);
      localStorage.setItem(DELETED_KEY, JSON.stringify(filtered));
    }

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(PRODUCTS_UPDATED_EVENT, { detail: { type: 'save', product } }));
    }
  } catch (err) {
    console.error('Failed to save stored custom product:', err);
  }
}

/**
 * Delete product in client storage and broadcast update.
 */
export function deleteStoredProduct(id: string, slug?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    // 1. Remove from custom products
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((p: any) => p.id !== id && (!slug || p.slug !== slug));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    }

    // 2. Add to deleted IDs
    const deletedRaw = localStorage.getItem(DELETED_KEY);
    const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
    if (!deletedIds.includes(id)) deletedIds.push(id);
    if (slug && !deletedIds.includes(slug)) deletedIds.push(slug);
    localStorage.setItem(DELETED_KEY, JSON.stringify(deletedIds));

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(PRODUCTS_UPDATED_EVENT, { detail: { type: 'delete', id, slug } }));
    }
  } catch (err) {
    console.error('Failed to delete stored product:', err);
  }
}


