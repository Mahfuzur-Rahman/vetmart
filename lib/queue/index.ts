// lib/queue/index.ts
// Queue driver interface (§4.2, §4.3)
import { env } from '@/lib/env';

export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
}

export interface QueueDriver {
  enqueue(job: JobPayload, opts?: EnqueueOptions): Promise<string>;
  process(handler: (job: JobPayload) => Promise<void>): Promise<void>;
}

export function getQueueDriver(): QueueDriver {
  switch (env.QUEUE_DRIVER) {
    case 'bullmq': {
      const { bullmqDriver } = require('./bullmq');
      return bullmqDriver;
    }
    case 'pg-cron': {
      const { pgCronDriver } = require('./pg-cron');
      return pgCronDriver;
    }
    default:
      throw new Error(`Unsupported QUEUE_DRIVER: ${env.QUEUE_DRIVER}`);
  }
}
