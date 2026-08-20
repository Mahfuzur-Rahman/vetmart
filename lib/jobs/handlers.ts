// lib/jobs/handlers.ts
// The job handler registry, shared by BOTH queue drivers (§4.2).
//
// The demo target drains this through /api/internal/jobs/tick on Vercel Cron;
// production drains it through the BullMQ worker in lib/jobs/worker.ts. Only
// the dispatcher differs — the handlers below are identical in both, which is
// what makes QUEUE_DRIVER a config change rather than a rewrite.
import type { JobPayload } from '@/lib/queue';

export type JobHandler = (data: Record<string, unknown>) => Promise<void>;

/**
 * Registered job types.
 *
 * Deliberately empty: nothing enqueues yet. Add handlers here as the features
 * that need them land (courier sync, SMS send, image processing, invoice PDF
 * render — all of which §2 rule 2 keeps out of the request cycle). Registering
 * a handler is the only step needed; both drivers pick it up.
 */
export const JOB_HANDLERS: Record<string, JobHandler> = {};

/**
 * Dispatch one job to its handler.
 *
 * An unknown type throws rather than being silently dropped, so the queue's
 * retry/failure accounting records it and it shows up in the failed-jobs view
 * instead of disappearing.
 */
export async function runJob(job: JobPayload): Promise<void> {
  const handler = JOB_HANDLERS[job.type];

  if (!handler) {
    throw new Error(
      `No handler registered for job type "${job.type}". Register it in lib/jobs/handlers.ts.`
    );
  }

  await handler(job.data);
}
