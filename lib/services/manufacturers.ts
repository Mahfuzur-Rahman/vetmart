// lib/services/manufacturers.ts
// Manufacturer listing and lookup (§5.2)
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { manufacturers } from '@/lib/db/schema';

/**
 * List all active manufacturers sorted alphabetically.
 */
export async function listManufacturers() {
  return db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      country: manufacturers.country,
      logoPath: manufacturers.logoPath,
    })
    .from(manufacturers)
    .where(eq(manufacturers.isActive, true))
    .orderBy(asc(manufacturers.name));
}

/**
 * Fetch a single manufacturer by ID.
 */
export async function getManufacturerById(id: string) {
  const [mfg] = await db
    .select()
    .from(manufacturers)
    .where(eq(manufacturers.id, id))
    .limit(1);

  return mfg ?? null;
}
