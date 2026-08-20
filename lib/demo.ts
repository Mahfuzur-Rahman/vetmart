// lib/demo.ts
// Centralized demo-mode check — avoids importing env in every page
import { env } from '@/lib/env';

/**
 * Returns true when DEMO_MODE=true in environment.
 * When true, all DB queries should be skipped and mock data used directly.
 * This eliminates the 10s connect_timeout penalty on every page navigation.
 */
export function isDemoMode(): boolean {
  if (env.DEMO_MODE === true) return true;
  // If running in Vercel serverless but DATABASE_URL is still the default localhost fallback, enable demo mode
  if (
    process.env.VERCEL === '1' &&
    (!env.DATABASE_URL ||
      env.DATABASE_URL.includes('localhost') ||
      env.DATABASE_URL.includes('127.0.0.1'))
  ) {
    return true;
  }
  return false;
}
