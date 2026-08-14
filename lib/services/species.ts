// lib/services/species.ts
// Species navigation — the primary browsing axis for BD veterinary e-commerce (§2 rule 1, §7)
import type { Locale } from '@/lib/i18n/config';

export interface SpeciesInfo {
  key: string;
  nameEn: string;
  nameBn: string;
  emoji: string;
  slug: string;
  description?: {
    en: string;
    bn: string;
  };
}

/**
 * The canonical species list (§7).
 * Static — species don't change at runtime. This avoids a DB round-trip for the
 * most-used navigation element on every page load.
 */
export const SPECIES: SpeciesInfo[] = [
  {
    key: 'cattle',
    nameEn: 'Cattle',
    nameBn: 'গরু',
    emoji: '🐄',
    slug: 'cattle',
    description: {
      en: 'Medicines, vaccines & supplements for cattle',
      bn: 'গরুর জন্য ওষুধ, ভ্যাকসিন ও সাপ্লিমেন্ট',
    },
  },
  {
    key: 'buffalo',
    nameEn: 'Buffalo',
    nameBn: 'মহিষ',
    emoji: '🐃',
    slug: 'buffalo',
    description: {
      en: 'Medicines & supplements for buffalo',
      bn: 'মহিষের জন্য ওষুধ ও সাপ্লিমেন্ট',
    },
  },
  {
    key: 'goat_sheep',
    nameEn: 'Goat & Sheep',
    nameBn: 'ছাগল ও ভেড়া',
    emoji: '🐐',
    slug: 'goat-sheep',
    description: {
      en: 'Dewormers, vaccines & nutrition for goat and sheep',
      bn: 'ছাগল ও ভেড়ার কৃমিনাশক, ভ্যাকসিন ও পুষ্টি',
    },
  },
  {
    key: 'poultry',
    nameEn: 'Poultry',
    nameBn: 'পোল্ট্রি',
    emoji: '🐔',
    slug: 'poultry',
    description: {
      en: 'Antibiotics, vitamins & premixes for poultry',
      bn: 'পোল্ট্রির অ্যান্টিবায়োটিক, ভিটামিন ও প্রিমিক্স',
    },
  },
  {
    key: 'fish',
    nameEn: 'Fish & Aquaculture',
    nameBn: 'মাছ ও মৎস্য চাষ',
    emoji: '🐟',
    slug: 'fish',
    description: {
      en: 'Probiotics, minerals & treatments for fish farming',
      bn: 'মাছ চাষের প্রোবায়োটিক, মিনারেল ও চিকিৎসা',
    },
  },
  {
    key: 'dog',
    nameEn: 'Dog',
    nameBn: 'কুকুর',
    emoji: '🐕',
    slug: 'dog',
    description: {
      en: 'Pet medicine, vaccines & nutrition for dogs',
      bn: 'কুকুরের ওষুধ, ভ্যাকসিন ও পুষ্টি',
    },
  },
  {
    key: 'cat',
    nameEn: 'Cat',
    nameBn: 'বিড়াল',
    emoji: '🐈',
    slug: 'cat',
    description: {
      en: 'Pet medicine & nutrition for cats',
      bn: 'বিড়ালের ওষুধ ও পুষ্টি',
    },
  },
  {
    key: 'pigeon',
    nameEn: 'Pigeon',
    nameBn: 'কবুতর',
    emoji: '🕊️',
    slug: 'pigeon',
    description: {
      en: 'Medicines & supplements for pigeons',
      bn: 'কবুতরের ওষুধ ও সাপ্লিমেন্ট',
    },
  },
];

/**
 * Get localized species name.
 */
export function getSpeciesName(key: string, locale: Locale): string {
  const species = SPECIES.find((s) => s.key === key);
  if (!species) return key;
  return locale === 'bn' ? species.nameBn : species.nameEn;
}

/**
 * Look up species info by its URL slug (e.g. 'goat-sheep' → goat_sheep).
 */
export function getSpeciesBySlug(slug: string): SpeciesInfo | undefined {
  return SPECIES.find((s) => s.slug === slug);
}

/**
 * Convert a species URL slug back to its database key.
 * 'goat-sheep' → 'goat_sheep'
 */
export function speciesSlugToKey(slug: string): string | null {
  const species = getSpeciesBySlug(slug);
  return species?.key ?? null;
}
