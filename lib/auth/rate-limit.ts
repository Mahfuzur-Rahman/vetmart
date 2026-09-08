import IORedis from 'ioredis';
import { env } from '@/lib/env';

let redisConnection: IORedis | null = null;

export function getRedis() {
  if (!redisConnection) {
    redisConnection = new IORedis(env.VALKEY_URL, {
      maxRetriesPerRequest: 0,
      connectTimeout: 500,
      lazyConnect: true,
    });
    
    // Suppress unhandled error events so they don't crash the Node process
    redisConnection.on('error', () => {});
  }
  return redisConnection;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Basic fixed-window rate limiter using Redis.
 *
 * Throws if Valkey is unreachable. Callers decide how to degrade — see
 * `rateLimitOrAllow` for the fail-open wrapper used on login paths, where a
 * dead cache must not lock every customer out of the shop.
 *
 * @param identifier Unique key (e.g. IP address)
 * @param limit Maximum requests allowed in the window
 * @param windowSeconds Window duration in seconds
 */
export async function rateLimit(
  identifier: string,
  limit: number = 5,
  windowSeconds: number = 600
): Promise<RateLimitResult> {
  const redis = getRedis();
  const currentWindow = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `ratelimit:${identifier}:${currentWindow}`;

  // Increment the counter for this window
  const currentCount = await redis.incr(key);

  // If it's the first request in the window, set the expiry
  if (currentCount === 1) {
    await redis.expire(key, windowSeconds);
  }

  const resetTime = (currentWindow + 1) * windowSeconds * 1000;
  
  return {
    success: currentCount <= limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
    reset: resetTime,
  };
}

/**
 * `rateLimit` that allows the request through when the limiter itself is
 * broken, logging loudly instead.
 *
 * Chosen deliberately: with Valkey down, failing closed takes the whole shop
 * offline (no OTP login, no admin login), while failing open leaves the
 * database-backed controls still standing — the per-phone OTP cooldown in
 * `lib/auth/otp.ts` and the per-row attempt counter.
 */
export async function rateLimitOrAllow(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  try {
    return await rateLimit(identifier, limit, windowSeconds);
  } catch (err) {
    console.error(
      `[rateLimit] Limiter unavailable for "${identifier}" — allowing the request. Fix Valkey:`,
      err
    );
    return { success: true, limit, remaining: limit, reset: Date.now() + windowSeconds * 1000 };
  }
}
