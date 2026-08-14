// lib/queue/bullmq.ts
// BullMQ queue driver for production VPS (§4.1, §4.3)
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@/lib/env';
import type { QueueDriver, JobPayload, EnqueueOptions } from './index';

let redisConnection: IORedis | null = null;
let defaultQueue: Queue | null = null;

function getRedis() {
  if (!redisConnection) {
    redisConnection = new IORedis(env.VALKEY_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return redisConnection;
}

function getQueue() {
  if (!defaultQueue) {
    defaultQueue = new Queue('vetmart-jobs', {
      connection: getRedis(),
    });
  }
  return defaultQueue;
}

export const bullmqDriver: QueueDriver = {
  async enqueue(job: JobPayload, opts?: EnqueueOptions): Promise<string> {
    const queue = getQueue();
    const delay = opts?.runAt ? Math.max(0, opts.runAt.getTime() - Date.now()) : undefined;
    const added = await queue.add(job.type, job.data, {
      delay,
      attempts: opts?.maxAttempts ?? 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
    return added.id || String(Date.now());
  },

  async process(handler: (job: JobPayload) => Promise<void>): Promise<void> {
    new Worker(
      'vetmart-jobs',
      async (bullJob) => {
        await handler({
          type: bullJob.name,
          data: bullJob.data as Record<string, unknown>,
        });
      },
      { connection: getRedis() }
    );
  },
};
