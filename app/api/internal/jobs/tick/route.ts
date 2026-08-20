// app/api/internal/jobs/tick/route.ts
// Vercel Cron entry point for the pg-cron queue driver (§4.2).
//
// The demo target has no long-running worker, so BullMQ cannot run there. The
// pg-cron driver claims rows from the `jobs` table with FOR UPDATE SKIP LOCKED;
// this route is what invokes it. Production swaps QUEUE_DRIVER to bullmq and
// this endpoint is simply never called — the job handlers are identical.
import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getQueueDriver } from '@/lib/queue';
import { env } from '@/lib/env';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Constant-time comparison so the secret cannot be recovered by timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Vercel Cron sends an `Authorization: Bearer <CRON_SECRET>` header. We also
 * accept `x-jobs-drain-secret` so the endpoint can be driven manually during a
 * deploy check without impersonating the cron.
 */
function isAuthorized(req: NextRequest): boolean {
  const expected = env.JOBS_DRAIN_SECRET;
  if (!expected) return false;

  const header = req.headers.get('x-jobs-drain-secret');
  if (header && secretMatches(header, expected)) return true;

  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (bearer && secretMatches(bearer, expected)) return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    // 404 rather than 401: an unauthenticated caller should not learn that an
    // internal drain endpoint exists here.
    return apiError('NOT_FOUND', 'Not found', 404);
  }

  const startedAt = Date.now();

  try {
    const queue = getQueueDriver();

    // The driver claims a bounded batch per tick and returns. Cron runs again a
    // minute later, so a backlog drains across ticks rather than risking the
    // function timeout in one pass.
    await queue.process(async (job) => {
      // Job handlers are shared with the BullMQ worker; nothing driver-specific
      // belongs here (§4.2).
      const { runJob } = await import('@/lib/jobs/handlers');
      await runJob(job);
    });

    return apiSuccess({ ok: true, durationMs: Date.now() - startedAt });
  } catch (err) {
    console.error('[jobs/tick] Drain failed:', err);
    return apiError(
      'JOB_DRAIN_FAILED',
      err instanceof Error ? err.message : 'Job drain failed',
      500
    );
  }
}
