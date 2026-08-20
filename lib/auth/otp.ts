// lib/auth/otp.ts
// Customer phone OTP generation, rate limiting, and verification (§8, §20)
import { eq, and, desc, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { otpRequests, users } from '@/lib/db/schema';
import { hashOtp, verifyOtpHash } from './hash';
import { normalizePhone } from '@/lib/i18n/number';
import { getSmsDriver } from '@/lib/sms';
import { env } from '@/lib/env';

export interface RequestOtpResult {
  success: boolean;
  cooldownSeconds?: number;
  message?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  user?: typeof users.$inferSelect;
  error?: string;
}

/**
 * Request an OTP code for a phone number.
 */
export async function requestOtp(rawPhone: string, purpose: string = 'login'): Promise<RequestOtpResult> {
  const canonicalPhone = normalizePhone(rawPhone);

  // 1. Check for active cooldown (60 seconds resend cooldown §8)
  const [latestRequest] = await db
    .select()
    .from(otpRequests)
    .where(and(eq(otpRequests.phone, canonicalPhone), isNull(otpRequests.usedAt)))
    .orderBy(desc(otpRequests.createdAt))
    .limit(1);

  if (latestRequest) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(latestRequest.createdAt).getTime()) / 1000);
    if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
      return {
        success: false,
        cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds,
        message: `Please wait ${env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds}s before requesting a new OTP.`,
      };
    }
  }

  // 2. Generate 6-digit code (§8)
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeHash = hashOtp(canonicalPhone, code);
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000); // 3 minutes TTL

  // 3. Store OTP request row
  await db.insert(otpRequests).values({
    phone: canonicalPhone,
    codeHash,
    purpose,
    expiresAt,
  });

  // 4. Dispatch SMS via selected driver
  const smsDriver = getSmsDriver();
  const smsText = `Your VetMart verification code is ${code}. Valid for 3 minutes. Never share this code.`;
  await smsDriver.send(canonicalPhone, smsText);

  return {
    success: true,
    cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
  };
}

/**
 * Verify an OTP code and return the associated user (or create a new user).
 */
export async function verifyOtp(rawPhone: string, code: string): Promise<VerifyOtpResult> {
  const canonicalPhone = normalizePhone(rawPhone);
  const now = new Date();

  // Find latest unused, unexpired OTP request
  const [activeRequest] = await db
    .select()
    .from(otpRequests)
    .where(
      and(
        eq(otpRequests.phone, canonicalPhone),
        isNull(otpRequests.usedAt),
        gt(otpRequests.expiresAt, now)
      )
    )
    .orderBy(desc(otpRequests.createdAt))
    .limit(1);

  if (!activeRequest) {
    return { success: false, error: 'OTP has expired or does not exist. Please request a new one.' };
  }

  // Check maximum attempts (max 5 attempts §8)
  if (activeRequest.attempts >= env.OTP_MAX_ATTEMPTS) {
    return { success: false, error: 'Maximum verification attempts exceeded. Please request a new code.' };
  }

  // Verify hash
  const isValid = verifyOtpHash(canonicalPhone, code, activeRequest.codeHash);

  if (!isValid) {
    // Increment attempts
    await db
      .update(otpRequests)
      .set({ attempts: activeRequest.attempts + 1 })
      .where(eq(otpRequests.id, activeRequest.id));

    return { success: false, error: 'Invalid verification code.' };
  }

  // Mark OTP as used
  await db
    .update(otpRequests)
    .set({ usedAt: now })
    .where(eq(otpRequests.id, activeRequest.id));

  // Find or create customer account
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.phone, canonicalPhone))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        phone: canonicalPhone,
        locale: 'bn',
        tier: 'retail',
      })
      .returning();
  }

  return {
    success: true,
    user,
  };
}
