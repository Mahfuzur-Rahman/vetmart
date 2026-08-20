// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';

import * as schema from './schema';

// Determine if running under serverless PgBouncer connection pooling (§4.2)
const isServerless = process.env.VERCEL === '1' || env.QUEUE_DRIVER === 'pg-cron';

export const sql = postgres(env.DATABASE_URL, {
  max: isServerless ? 1 : env.DB_POOL_MAX,
  idle_timeout: isServerless ? 20 : 0,
  connect_timeout: 10,
  prepare: isServerless ? false : true, // PgBouncer transaction mode breaks prepared statements
});

export const db = drizzle(sql, { schema });
