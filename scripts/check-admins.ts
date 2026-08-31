import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import * as schema from '../lib/db/schema';

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = path.resolve('.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          let url = trimmed.replace('DATABASE_URL=', '').trim();
          if (url.startsWith('"') && url.endsWith('"')) {
            url = url.substring(1, url.length - 1);
          }
          return url;
        }
      }
    }
  } catch (err) {}
  
  try {
    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          let url = trimmed.replace('DATABASE_URL=', '').trim();
          if (url.startsWith('"') && url.endsWith('"')) {
            url = url.substring(1, url.length - 1);
          }
          return url;
        }
      }
    }
  } catch (err) {}
  
  throw new Error('DATABASE_URL not found');
}

async function main() {
  const url = getDatabaseUrl();
  const queryClient = postgres(url);
  const db = drizzle(queryClient, { schema });
  
  const allAdmins = await db.select().from(schema.admins);
  console.log('Admins in DB:', allAdmins);
  process.exit(0);
}

main().catch(console.error);
