import IORedis from 'ioredis';
import { env } from '@/lib/env';

let redisConnection: IORedis | null = null;

export function getRedis() {
  if (!redisConnection) {
    redisConnection = new IORedis(env.VALKEY_URL, {
      maxRetriesPerRequest: null,
    });
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
