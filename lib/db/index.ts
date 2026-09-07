// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';

import * as schema from './schema';

// Determine if running under serverless PgBouncer connection pooling (§4.2)
const isServerless = process.env.VERCEL === '1';

export const sql = postgres(env.DATABASE_URL, {
  max: isServerless ? 1 : (env.DB_POOL_MAX || 10),
  idle_timeout: isServerless ? 20 : 0,
  connect_timeout: 15,
  prepare: isServerless ? false : true, // PgBouncer transaction mode breaks prepared statements
});

export const db = drizzle(sql, { schema });

/**
 * Quick health check to see if the database is reachable.
 * Useful for fast-failing layouts or API routes during an outage.
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (err) {
    return false;
  }
}
