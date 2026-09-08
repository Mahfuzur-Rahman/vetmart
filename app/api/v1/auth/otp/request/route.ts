// app/api/v1/auth/otp/request/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requestOtp } from '@/lib/auth/otp';
import { checkDbConnection } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api/response';
import { normalizeDigits, normalizePhone } from '@/lib/i18n/number';
import { getClientIp } from '@/lib/api/client-ip';
import { rateLimitOrAllow } from '@/lib/auth/rate-limit';

const requestSchema = z.object({
  phone: z.string().transform(normalizeDigits),
  purpose: z.string().optional().default('login'),
});

export async function POST(req: NextRequest) {
  try {
    if (!(await checkDbConnection())) {
      return apiError('SERVICE_UNAVAILABLE', 'Service is currently unavailable', 503);
    }

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

    // §8 requires a limit per phone AND per IP.
    //
    // The IP key now comes from getClientIp: reading the leftmost
    // X-Forwarded-For entry meant a caller could send a different value each
    // request and get an unlimited number of fresh buckets.
    //
    // The per-phone key is what stops SMS-bombing one victim's handset — the
    // 60s DB cooldown alone allowed 1440 messages a day to a single number, at
    // our expense.
    const ip = getClientIp(req);
    const canonicalPhone = normalizePhone(parsed.data.phone);

    const [ipLimit, phoneLimit] = await Promise.all([
      rateLimitOrAllow(`otp-request:ip:${ip}`, 5, 600),
      rateLimitOrAllow(`otp-request:phone:${canonicalPhone}`, 5, 3600),
    ]);

    if (!ipLimit.success) {
      return apiError(
        'TOO_MANY_REQUESTS',
        'Too many OTP requests from this network. Please try again later.',
        429,
        'rate_limit'
      );
    }

    if (!phoneLimit.success) {
      return apiError(
        'TOO_MANY_REQUESTS',
        'Too many codes requested for this number. Please try again in an hour.',
        429,
        'phone'
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
    });
  } catch (err: any) {
    return apiError('OTP_REQUEST_FAILED', err?.message || 'Failed to request OTP', 500);
  }
}
