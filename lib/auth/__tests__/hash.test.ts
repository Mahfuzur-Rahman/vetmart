// lib/auth/__tests__/hash.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, hashOtp, verifyOtpHash } from '../hash';

describe('Auth Hash Utilities (§8)', () => {
  it('hashes and verifies passwords securely', () => {
    const password = 'VetMartSecurePassword2026!';
    const hashed = hashPassword(password);

    expect(hashed).toContain(':');
    expect(verifyPassword(password, hashed)).toBe(true);
    expect(verifyPassword('WrongPassword123', hashed)).toBe(false);
  });

  it('generates reproducible HMAC OTP hashes for same phone and code', () => {
    const phone = '8801712345678';
    const code = '482910';

    const hash1 = hashOtp(phone, code);
    const hash2 = hashOtp(phone, code);

    expect(hash1).toBe(hash2);
    expect(verifyOtpHash(phone, code, hash1)).toBe(true);
    expect(verifyOtpHash(phone, '999999', hash1)).toBe(false);
    expect(verifyOtpHash('8801811111111', code, hash1)).toBe(false); // Phone bound
  });
});
