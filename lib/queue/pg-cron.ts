// lib/queue/pg-cron.ts
// Postgres jobs table queue driver for Vercel demo (§4.2)
import { sql } from '@/lib/db';
import type { QueueDriver, JobPayload, EnqueueOptions } from './index';

export const pgCronDriver: QueueDriver = {
  async enqueue(job: JobPayload, opts?: EnqueueOptions): Promise<string> {
    const runAt = opts?.runAt || new Date();
    const maxAttempts = opts?.maxAttempts ?? 5;

    // Check if jobs table exists or mock
    try {
      const result = await sql`
        INSERT INTO jobs (type, payload, run_at, max_attempts, status)
        VALUES (${job.type}, ${JSON.stringify(job.data)}, ${runAt}, ${maxAttempts}, 'pending')
        RETURNING id
      `;
      return String(result[0]?.id || Date.now());
    } catch {
      // In early scaffold before table migration
      console.log(`[pg-cron-fallback] Enqueued ${job.type}:`, job.data);
      return `mock-job-${Date.now()}`;
    }
  },

  async process(handler: (job: JobPayload) => Promise<void>): Promise<void> {
    // Called by the /api/internal/jobs/tick Vercel cron handler (§4.2)
    try {
      const jobs = await sql`
        UPDATE jobs
        SET status = 'running', locked_at = NOW()
        WHERE id IN (
          SELECT id FROM jobs
          WHERE status = 'pending' AND run_at <= NOW()
          ORDER BY run_at ASC
          LIMIT 10
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, type, payload
      `;

      for (const row of jobs) {
        try {
          await handler({ type: row.type, data: row.payload as Record<string, unknown> });
          await sql`UPDATE jobs SET status = 'done' WHERE id = ${row.id}`;
        } catch (err: any) {
          await sql`
            UPDATE jobs
            SET status = CASE WHEN attempts + 1 >= max_attempts THEN 'failed' ELSE 'pending' END,
                attempts = attempts + 1,
                last_error = ${err?.message || 'Error'}
            WHERE id = ${row.id}
          `;
        }
      }
    } catch (err) {
      console.error('[pg-cron] Process tick error:', err);
    }
  },
};
