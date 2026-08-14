// lib/auth/hash.ts
// Secure cryptographic hashing for passwords and OTP codes (§8, §20)
import crypto from 'node:crypto';

/**
 * Hash a password using PBKDF2 with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against a stored salt:hash string.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

/**
 * Hash a 6-digit OTP code with a phone-bound salt for database storage (§8).
 * We store hashes only so database compromises cannot leak active OTPs.
 */
export function hashOtp(phone: string, code: string): string {
  return crypto.createHmac('sha256', phone).update(code.trim()).digest('hex');
}

/**
 * Constant-time comparison of an OTP code against a stored hash.
 */
export function verifyOtpHash(phone: string, code: string, storedHash: string): boolean {
  const computed = hashOtp(phone, code);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}
