// lib/i18n/number.ts
// THE ONLY PLACE numbers become strings (§15.3)
import type { Locale } from './config';

/**
 * Format a number with locale-appropriate digits and grouping.
 * Bangla uses ০-৯ digits and lakh/crore grouping (১,২০,০০০).
 * English uses Western digits but still lakh/crore grouping for BD (1,20,000).
 */
export function fmtNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(n);
}

/**
 * Format paisa (integer) as Taka currency string.
 * ৳ (U+09F3) is the Taka sign — not Tk, not BDT (§15.3 rule 2).
 * Money is always integer paisa in TypeScript, numeric(12,2) in Postgres (§2 rule 5).
 */
export function fmtMoney(paisa: number, locale: Locale): string {
  const taka = paisa / 100;
  const formatted = new Intl.NumberFormat(
    locale === 'bn' ? 'bn-BD' : 'en-BD',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  ).format(taka);
  return `৳${formatted}`;
}

/**
 * Normalize Bengali (০-৯) and Arabic-Indic (٠-٩) digits to ASCII 0-9.
 * Apply in Zod preprocessors for every numeric and phone field (§15.3 rule 3).
 * Must run server-side too — mobile clients and copy-paste bypass the UI (§20).
 */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Normalize BD phone number to canonical 8801XXXXXXXXX format (§20).
 * Accepts: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX, and Bengali digit variants.
 * One canonical form in the DB, always.
 */
export function normalizePhone(raw: string): string {
  const digits = normalizeDigits(raw).replace(/\D/g, '');
  if (digits.startsWith('8801') && digits.length === 13) return digits;
  if (digits.startsWith('01') && digits.length === 11) return `88${digits}`;
  throw new Error(`Invalid BD phone number: ${raw}`);
}

/**
 * Format a date in the appropriate locale.
 * Gregorian calendar with Bangla month names via Intl.DateTimeFormat('bn-BD') (§15.3 rule 6).
 * Do NOT use the Bangla calendar (Poush/Magh) — nobody uses it for commerce.
 */
export function fmtDate(
  date: Date,
  locale: Locale,
  opts?: Intl.DateTimeFormatOptions
): string {
  const defaults: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Dhaka',
  };
  return new Intl.DateTimeFormat(
    locale === 'bn' ? 'bn-BD' : 'en-BD',
    opts ?? defaults
  ).format(date);
}

/**
 * Format expiry date in dual-script format for invoices (§15.3 rule 6):
 * ৩১ ডিসেম্বর ২০২৬ (31 Dec 2026)
 */
export function fmtExpiryDual(date: Date): string {
  const bn = fmtDate(date, 'bn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Dhaka',
  });
  const en = fmtDate(date, 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Dhaka',
  });
  return `${bn} (${en})`;
}
