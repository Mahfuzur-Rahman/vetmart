// lib/api/client-ip.ts
// Resolve the caller's IP for rate limiting.

import type { NextRequest } from 'next/server';

/**
 * Best-effort client IP, chosen so a caller cannot mint themselves a fresh
 * rate-limit bucket.
 *
 * `X-Forwarded-For` is appended to by each hop, so its LEFTMOST entry is
 * whatever the client sent — reading that made both the OTP and the admin-login
 * limiters trivially bypassable by varying the header per request. The
 * RIGHTMOST entry is the one our own trusted proxy (Caddy on the VPS, Vercel's
 * edge in the demo) wrote, so that is the value to key on.
 *
 * Platform-specific single-value headers are preferred where present because
 * they are set by the platform and not forwarded from the client.
 */
export function getClientIp(req: NextRequest): string {
  // Vercel sets this to the real client address and strips any inbound copy.
  const vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    const last = vercelIp.split(',').pop()?.trim();
    if (last) return last;
  }

  // Caddy/nginx style single-value header.
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);
    // Rightmost = written by the closest trusted proxy.
    const last = hops[hops.length - 1];
    if (last) return last;
  }

  return 'unknown';
}
