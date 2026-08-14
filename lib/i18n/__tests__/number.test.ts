// lib/i18n/__tests__/number.test.ts
import { describe, it, expect } from 'vitest';
import { fmtMoney, fmtNumber, normalizeDigits, normalizePhone } from '../number';

describe('fmtMoney', () => {
  it('formats Bangla taka with Bengali digits and lakh grouping (§15.3 rule 1 guard)', () => {
    // Crucial ICU guard: ensures Node full-ICU is active
    expect(fmtMoney(12000000, 'bn')).toBe('৳১,২০,০০০.০০');
  });

  it('formats English taka with Western digits', () => {
    expect(fmtMoney(12000000, 'en')).toBe('৳120,000.00');
  });

  it('formats zero correctly', () => {
    expect(fmtMoney(0, 'bn')).toBe('৳০.০০');
    expect(fmtMoney(0, 'en')).toBe('৳0.00');
  });

  it('formats fractional paisa correctly', () => {
    expect(fmtMoney(50, 'bn')).toBe('৳০.৫০');
    expect(fmtMoney(50, 'en')).toBe('৳0.50');
  });
});

describe('fmtNumber', () => {
  it('formats numbers with Bengali digits', () => {
    expect(fmtNumber(12345, 'bn')).toBe('১২,৩৪৫');
  });

  it('formats numbers in English locale', () => {
    expect(fmtNumber(1200000, 'en')).toBe('1,200,000');
  });
});

describe('normalizeDigits', () => {
  it('converts Bengali digits to ASCII', () => {
    expect(normalizeDigits('০১৭১২৩৪৫৬৭৮')).toBe('01712345678');
  });

  it('passes standard ASCII digits through', () => {
    expect(normalizeDigits('01712345678')).toBe('01712345678');
  });

  it('handles mixed digit scripts gracefully', () => {
    expect(normalizeDigits('০1৭1২3')).toBe('017123');
  });
});

describe('normalizePhone', () => {
  it('normalizes 01XXXXXXXXX to 8801XXXXXXXXX', () => {
    expect(normalizePhone('01712345678')).toBe('8801712345678');
  });

  it('normalizes +8801XXXXXXXXX to 8801XXXXXXXXX', () => {
    expect(normalizePhone('+8801712345678')).toBe('8801712345678');
  });

  it('retains canonical 8801XXXXXXXXX', () => {
    expect(normalizePhone('8801712345678')).toBe('8801712345678');
  });

  it('normalizes phone numbers typed in Bengali digits', () => {
    expect(normalizePhone('০১৭১২৩৪৫৬৭৮')).toBe('8801712345678');
  });

  it('throws on invalid short numbers', () => {
    expect(() => normalizePhone('12345')).toThrow('Invalid BD phone number');
  });
});
