// tests/incomplete-orders-schema.test.ts
import { describe, it, expect } from 'vitest';
import { isValidBdPhone, sanitizeBdPhone } from '@/lib/validation/phone';

describe('BD Phone Validation & Sanitization', () => {
  it('validates correct 11-digit BD mobile numbers', () => {
    expect(isValidBdPhone('01711000000')).toBe(true);
    expect(isValidBdPhone('01812345678')).toBe(true);
    expect(isValidBdPhone('01999999999')).toBe(true);
    expect(isValidBdPhone('01300000000')).toBe(true);
    expect(isValidBdPhone('01400000000')).toBe(true);
    expect(isValidBdPhone('01500000000')).toBe(true);
    expect(isValidBdPhone('01600000000')).toBe(true);
  });

  it('rejects invalid mobile numbers', () => {
    expect(isValidBdPhone('01211000000')).toBe(false); // Invalid operator prefix
    expect(isValidBdPhone('0171100000')).toBe(false); // 10 digits
    expect(isValidBdPhone('017110000000')).toBe(false); // 12 digits
    expect(isValidBdPhone('abcdefghijk')).toBe(false);
    expect(isValidBdPhone('')).toBe(false);
  });

  it('sanitizes mobile numbers with +88 or spaces or dashes', () => {
    expect(sanitizeBdPhone('+8801711-000000')).toBe('01711000000');
    expect(sanitizeBdPhone('8801812 345678')).toBe('01812345678');
    expect(sanitizeBdPhone('  01912-345678  ')).toBe('01912345678');
    expect(sanitizeBdPhone('+88 01300 123 456')).toBe('01300123456');
  });
});
