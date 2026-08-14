// lib/demo.ts
// Centralized demo-mode check — avoids importing env in every page
import { env } from '@/lib/env';

/**
 * Returns true when DEMO_MODE=true in environment.
 * When true, all DB queries should be skipped and mock data used directly.
 * This eliminates the 10s connect_timeout penalty on every page navigation.
 */
export function isDemoMode(): boolean {
  return env.DEMO_MODE === true;
}
