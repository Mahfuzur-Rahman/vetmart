// lib/mock-data/categories.ts
export interface Category {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  descriptionEn?: string;
  descriptionBn?: string;
  iconSvg?: string;
  sort: number;
}

export interface Species {
  id: string;
  slug: string;
  nameEn: string;
  nameBn: string;
  icon: string;
  color: string;
}

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    slug: 'antibiotics',
    nameEn: 'Antibiotics & Antimicrobials',
    nameBn: 'অ্যান্টিবায়োটিক ও অ্যান্টিমাইক্রোবিয়াল',
    descriptionEn: 'Broad-spectrum veterinary antibiotics and therapeutics',
    descriptionBn: 'পশু-পাখির চিকিৎসার জন্য অ্যান্টিবায়োটিক',
    sort: 1,
  },
  {
    id: 'cat-2',
    slug: 'vitamins-minerals',
    nameEn: 'Vitamins & Mineral Premix',
    nameBn: 'ভিটামিন ও মিনারেল প্রিমিক্স',
    descriptionEn: 'Growth promoters, egg boosters, and nutritional supplements',
    descriptionBn: 'শারীরিক বৃদ্ধি ও উৎপাদন বৃদ্ধির সলিউশন',
    sort: 2,
  },
  {
    id: 'cat-3',
    slug: 'anthelmintics',
    nameEn: 'Anthelmintics (Dewormers)',
    nameBn: 'কৃমিনাশক ওষুধ',
    descriptionEn: 'Deworming solutions for cattle, goats, poultry, and pets',
    descriptionBn: 'কৃমি নিয়ন্ত্রণ ও প্রতিরোধক ওষুধ',
    sort: 3,
  },
  {
    id: 'cat-4',
    slug: 'feed-supplements',
    nameEn: 'Feed Supplements & Toxin Binders',
    nameBn: 'ফিড সাপ্লিমেন্ট ও টক্সিন বাইন্ডার',
    descriptionEn: 'Liver tonics, calcium liquid, and mycotoxin control',
    descriptionBn: 'লিভার টনিক, ক্যালসিয়াম ও ফিড এনহ্যান্সার',
    sort: 4,
  },
  {
    id: 'cat-5',
    slug: 'instruments',
    nameEn: 'Veterinary Instruments & AI',
    nameBn: 'চিকিৎসা সরঞ্জাম ও এআই যন্ত্রপাতি',
    descriptionEn: 'Artificial insemination guns, syringes, and clinical tools',
    descriptionBn: 'কৃত্রিম প্রজনন ও ক্লিনিকাল সরঞ্জাম',
    sort: 5,
  },
  {
    id: 'cat-6',
    slug: 'pet-care',
    nameEn: 'Pet Medicine & Nutrition',
    nameBn: 'পোষা প্রাণীর ওষুধ ও খাদ্য',
    descriptionEn: 'Vaccines, shampoos, tick control, and premium pet food',
    descriptionBn: 'কুকুর-বিড়ালের যত্ন, খাদ্য ও পরিচর্যা',
    sort: 6,
  },
];

export const MOCK_SPECIES: Species[] = [
  { id: 'sp-poultry', slug: 'poultry', nameEn: 'Poultry', nameBn: 'পোল্ট্রি (মুরগি/হাঁস)', icon: '🐓', color: 'from-amber-500 to-orange-600' },
  { id: 'sp-cattle', slug: 'cattle', nameEn: 'Cattle & Buffalo', nameBn: 'গরু ও মহিষ', icon: '🐄', color: 'from-emerald-500 to-teal-700' },
  { id: 'sp-goat', slug: 'goat-sheep', nameEn: 'Goat & Sheep', nameBn: 'ছাগল ও ভেড়া', icon: '🐐', color: 'from-lime-500 to-emerald-600' },
  { id: 'sp-pet', slug: 'pet', nameEn: 'Pet Care', nameBn: 'পোষা প্রাণী (কুকুর/বিড়াল)', icon: '🐕', color: 'from-sky-500 to-blue-600' },
  { id: 'sp-aqua', slug: 'aqua', nameEn: 'Aquaculture', nameBn: 'মৎস্য চাষ', icon: '🐟', color: 'from-cyan-500 to-blue-700' },
];
