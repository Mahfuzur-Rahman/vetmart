// lib/validation/phone.ts
// Bangladesh mobile phone validation and sanitization helpers

/**
 * Validates Bangladesh mobile phone numbers.
 * Format: 013, 014, 015, 016, 017, 018, 019 followed by 8 digits (total 11 digits).
 */
export function isValidBdPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = sanitizeBdPhone(phone);
  return /^01[3-9]\d{8}$/.test(cleaned);
}

/**
 * Sanitizes phone numbers by stripping country code (+88 / 88), spaces, dashes, and extra characters.
 */
export function sanitizeBdPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+880')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('+88')) {
    cleaned = cleaned.substring(3);
  }
  return cleaned.trim();
}
