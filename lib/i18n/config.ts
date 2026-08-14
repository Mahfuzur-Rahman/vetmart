// lib/i18n/config.ts
// Bangla is the default locale — not a translation layer (§7, §15.1)
export const locales = ['bn', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'bn';
