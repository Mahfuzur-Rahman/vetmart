// lib/demo.ts
// Centralized demo-mode check — avoids importing env in every page
import { env } from '@/lib/env';

/**
 * Returns true only when DEMO_MODE=true is explicitly set in the environment.
 *
 * When true, all DB queries are skipped and seed data is served directly, which
 * eliminates the connect_timeout penalty on every page navigation.
 *
 * Demo mode is NEVER inferred from a broken database configuration. An earlier
 * version enabled it automatically when running on Vercel with a localhost
 * DATABASE_URL; that turned a loud connection failure into a silently empty
 * catalog and let admin product writes be accepted and then dropped. The
 * misconfiguration is now rejected at boot by the superRefine in lib/env.ts.
 */
export function isDemoMode(): boolean {
  return env.DEMO_MODE === true;
}
