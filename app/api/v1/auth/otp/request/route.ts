// app/api/v1/auth/otp/request/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requestOtp } from '@/lib/auth/otp';
import { apiSuccess, apiError } from '@/lib/api/response';
import { normalizeDigits } from '@/lib/i18n/number';

const requestSchema = z.object({
  phone: z.string().transform(normalizeDigits),
  purpose: z.string().optional().default('login'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'INVALID_PHONE',
        'Valid Bangladeshi phone number is required (01XXXXXXXXX).',
        422,
        'phone'
      );
    }

    // Rate Limiting (5 requests per 10 minutes per IP)
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const { rateLimit } = await import('@/lib/auth/rate-limit');
    const limitResult = await rateLimit(`otp-request:${ip}`, 5, 600);

    if (!limitResult.success) {
      return apiError(
        'TOO_MANY_REQUESTS',
        'Too many OTP requests from this IP. Please try again later.',
        429,
        'rate_limit'
      );
    }



    const result = await requestOtp(parsed.data.phone, parsed.data.purpose);

    if (!result.success) {
      return apiError(
        'OTP_RATE_LIMITED',
        result.message || 'Please wait before requesting another OTP.',
        429,
        'phone'
      );
    }

    return apiSuccess({
      message: 'OTP sent successfully',
      cooldownSeconds: result.cooldownSeconds,
      demoCode: result.demoCode,
    });
  } catch (err: any) {
    return apiError('OTP_REQUEST_FAILED', err?.message || 'Failed to request OTP', 500);
  }
}
