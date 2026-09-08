// lib/auth/hash.ts
// Secure cryptographic hashing for passwords and OTP codes (§8, §20)
import crypto from 'node:crypto';
import { env } from '@/lib/env';

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
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    // A malformed stored hash makes the buffers different lengths, which throws.
    // That is a bad credential, not a 500.
    return false;
  }
}

/**
 * Hash a 6-digit OTP code for database storage (§8).
 *
 * Keyed with the server's signing secret and BOUND to the phone number in the
 * message, not the key. Using the phone as the HMAC key — as this did — gave no
 * protection at all: the phone sits in the same `otp_requests` row, so anyone
 * holding a database dump could recover a live code by hashing all 10^6
 * possibilities. The secret is not in the database, so now they cannot.
 */
export function hashOtp(phone: string, code: string): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`otp:${phone}:${code.trim()}`)
    .digest('hex');
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
