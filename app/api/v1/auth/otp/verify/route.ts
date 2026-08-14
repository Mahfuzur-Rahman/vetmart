// app/api/v1/auth/otp/verify/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyOtp } from '@/lib/auth/otp';
import { signJwt } from '@/lib/auth/jwt';
import { setCustomerSession } from '@/lib/auth/session';
import { apiSuccess, apiError } from '@/lib/api/response';
import { normalizeDigits } from '@/lib/i18n/number';

const verifySchema = z.object({
  phone: z.string().transform(normalizeDigits),
  code: z.string().transform(normalizeDigits),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Phone and 6-digit OTP code are required.', 422);
    }

    const result = await verifyOtp(parsed.data.phone, parsed.data.code);

    if (!result.success || !result.user) {
      return apiError('INVALID_OTP', result.error || 'Invalid or expired OTP code.', 401, 'code');
    }

    // Set web cookie session
    await setCustomerSession(result.user.id);

    // Generate JWT access & refresh tokens for mobile clients (§8)
    const accessToken = signJwt({ sub: result.user.id, type: 'access' }, 15 * 60); // 15 mins
    const refreshToken = signJwt({ sub: result.user.id, type: 'refresh' }, 60 * 24 * 60 * 60); // 60 days

    return apiSuccess({
      user: {
        id: result.user.id,
        phone: result.user.phone,
        name: result.user.name,
        locale: result.user.locale,
        tier: result.user.tier,
        isVerifiedVet: result.user.isVerifiedVet,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (err: any) {
    return apiError('VERIFICATION_FAILED', err?.message || 'Verification failed', 500);
  }
}
