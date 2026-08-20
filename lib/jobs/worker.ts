// lib/jobs/worker.ts
// Long-running job worker for the VPS target — `pnpm jobs`, run under PM2 as
// the `vetmart-jobs` fork process (§4.1, §19).
//
// On Vercel there is no long-running process, so the same handlers are drained
// by /api/internal/jobs/tick on a cron instead (§4.2).
import { getQueueDriver } from '@/lib/queue';
import { runJob } from './handlers';
import { env } from '@/lib/env';

const POLL_INTERVAL_MS = 5_000;

let shuttingDown = false;

async function main() {
  const queue = getQueueDriver();
  console.log(`[vetmart-jobs] Worker started with QUEUE_DRIVER=${env.QUEUE_DRIVER}`);

  // The bullmq driver blocks internally; the pg-cron driver returns after one
  // batch, so it is polled here.
  while (!shuttingDown) {
    try {
      await queue.process(runJob);
    } catch (err) {
      console.error('[vetmart-jobs] Drain error:', err);
    }

    if (env.QUEUE_DRIVER === 'bullmq') break; // driver owns its own loop
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// PM2 sends SIGINT/SIGTERM on reload; finish the current batch, then exit.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[vetmart-jobs] ${signal} received, shutting down after current batch.`);
    shuttingDown = true;
  });
}

main().catch((err) => {
  console.error('[vetmart-jobs] Fatal:', err);
  process.exit(1);
});
