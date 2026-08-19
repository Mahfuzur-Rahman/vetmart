// lib/services/drug-classifications.ts
// Pure, client-safe definitions, fallbacks, and helpers for Drug Classifications

export interface DrugClassificationInfo {
  id?: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  emoji: string;
  descriptionEn?: string | null;
  descriptionBn?: string | null;
  sort: number;
  showOnMenu: boolean;
  showOnHomepage?: boolean;
  isActive: boolean;
}

export const DEFAULT_DRUG_CLASSIFICATIONS: DrugClassificationInfo[] = [
  {
    slug: 'vaccine',
    nameEn: 'Vaccines & Biologicals',
    nameBn: 'ভ্যাকসিন ও বায়োলজিক্যালস',
    emoji: '💉',
    descriptionEn: 'Cold-chain guaranteed viral & bacterial vaccines for livestock & pets',
    descriptionBn: 'কোল্ড-চেইন নিশ্চিত ভাইরাল ও ব্যাকটেরিয়াল ভ্যাকসিন',
    sort: 1,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'antibiotics',
    nameEn: 'Antibiotics & Anti-infectives',
    nameBn: 'অ্যান্টিবায়োটিক ও রেজিস্টার্ড ওষুধ',
    emoji: '💊',
    descriptionEn: 'Injectables, bolus & oral antibiotics with withdrawal info',
    descriptionBn: 'ইনজেকশন, বোলাস ও ওরাল অ্যান্টিবায়োটিক',
    sort: 2,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'vitamins',
    nameEn: 'Feed Additives & Vitamins',
    nameBn: 'ফিড অ্যাডিটিভস ও ভিটামিন',
    emoji: '🌾',
    descriptionEn: 'Growth promoters, premixes, calcium & liquid vitamins',
    descriptionBn: 'গ্রোথ প্রমোটার, প্রিমিক্স ও লিকুইড ভিটামিন',
    sort: 3,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'disinfectants',
    nameEn: 'Disinfectants & Biosecurity',
    nameBn: 'বায়ো-সিকিউরিটি ও ডিসইনফেক্টেন্ট',
    emoji: '🧼',
    descriptionEn: 'Shed sanitizers, water purifiers & foot dip solutions',
    descriptionBn: 'শেড জীবাণুনাশক ও পানি বিশুদ্ধকরণ',
    sort: 4,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'dewormers',
    nameEn: 'Dewormers & Parasiticides',
    nameBn: 'কৃমিনাশক বোলুস ও ড্রেঞ্চ',
    emoji: '🧪',
    descriptionEn: 'Broad-spectrum dewormers & ectoparasite drops',
    descriptionBn: 'ব্রড-স্পেকট্রাম কৃমিনাশক ও পরজীবীনাশক',
    sort: 5,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'hormones',
    nameEn: 'Reproductive & Hormones',
    nameBn: 'প্রজনন ও হরমোন প্রিপারেশন',
    emoji: '🧬',
    descriptionEn: 'AI estrus synchronization & fertility boosters',
    descriptionBn: 'কৃত্রিম প্রজনন ও হরমোন ব্যবস্থাপনা',
    sort: 6,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'nsaids-pain',
    nameEn: 'NSAIDs & Pain Relief',
    nameBn: 'ব্যথানাশক ও প্রদাহরোধী ওষুধ',
    emoji: '🩹',
    descriptionEn: 'Anti-inflammatory, antipyretic & analgesic injections & boluses',
    descriptionBn: 'অ্যান্টি-ইনফ্ল্যামেটরি ও জ্বর-ব্যথানাশক ওষুধ',
    sort: 7,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'antihistamines',
    nameEn: 'Antihistamines & Allergy',
    nameBn: 'অ্যালার্জি ও অ্যান্টিহিস্টামিন',
    emoji: '🌿',
    descriptionEn: 'Fast-acting anti-allergic & anti-bloat formulations',
    descriptionBn: 'দ্রুত কার্যকরী অ্যান্টিহিস্টামিন ইনজেকশন',
    sort: 8,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
  {
    slug: 'digestive-rumen',
    nameEn: 'Digestive & Rumen Torics',
    nameBn: 'হজমকারক ও রুমিটরিক্স',
    emoji: '🥣',
    descriptionEn: 'Rumen stimulants, antacids & digestive enzymes',
    descriptionBn: 'রুমিটরিক্স, অ্যান্টাসিড ও হজমকারক পাউডার',
    sort: 9,
    showOnMenu: true,
    showOnHomepage: true,
    isActive: true,
  },
];
