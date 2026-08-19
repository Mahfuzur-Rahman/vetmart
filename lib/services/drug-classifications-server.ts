// lib/services/drug-classifications-server.ts
// Server-only database operations for Drug Classifications (§5.2, §6, §7)
import { eq, and, asc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { drugClassifications } from '@/lib/db/schema';
import { DEFAULT_DRUG_CLASSIFICATIONS, type DrugClassificationInfo } from './drug-classifications';

let isTableEnsured = false;

/**
 * Automatically ensure table exists in PostgreSQL and seed defaults if empty.
 */
export async function ensureDrugClassificationsTable() {
  if (isTableEnsured) return;
  try {
    // 1. Create table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "drug_classifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" text NOT NULL UNIQUE,
        "name_en" text NOT NULL,
        "name_bn" text NOT NULL,
        "emoji" text NOT NULL DEFAULT '💊',
        "description_en" text,
        "description_bn" text,
        "sort" integer NOT NULL DEFAULT 0,
        "show_on_menu" boolean NOT NULL DEFAULT true,
        "show_on_homepage" boolean NOT NULL DEFAULT true,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    // 2. Check if table is empty and seed
    const countRes: any = await db.execute(sql`SELECT count(*)::int as cnt FROM "drug_classifications"`);
    const count = countRes?.[0]?.cnt ?? countRes?.rows?.[0]?.cnt ?? 0;


    if (count === 0) {
      for (const item of DEFAULT_DRUG_CLASSIFICATIONS) {
        await db.execute(sql`
          INSERT INTO "drug_classifications" (
            "slug", "name_en", "name_bn", "emoji", "description_en", "description_bn", "sort", "show_on_menu", "show_on_homepage", "is_active"
          ) VALUES (
            ${item.slug}, ${item.nameEn}, ${item.nameBn}, ${item.emoji}, ${item.descriptionEn || null}, ${item.descriptionBn || null}, ${item.sort}, ${item.showOnMenu}, ${item.showOnHomepage !== false}, ${item.isActive}
          )
          ON CONFLICT ("slug") DO NOTHING;
        `);
      }
    }

    isTableEnsured = true;
  } catch (err) {
    console.warn('[ensureDrugClassificationsTable] Notice:', err);
  }
}

/**
 * List drug classifications with optional menu and active filters.
 */
export async function listDrugClassifications(opts?: {
  showOnMenu?: boolean;
  showOnHomepage?: boolean;
  isActive?: boolean;
}): Promise<DrugClassificationInfo[]> {
  try {
    await ensureDrugClassificationsTable();

    const conditions = [];
    if (opts?.isActive !== undefined) {
      conditions.push(eq(drugClassifications.isActive, opts.isActive));
    }
    if (opts?.showOnMenu !== undefined) {
      conditions.push(eq(drugClassifications.showOnMenu, opts.showOnMenu));
    }
    if (opts?.showOnHomepage !== undefined) {
      conditions.push(eq(drugClassifications.showOnHomepage, opts.showOnHomepage));
    }

    const rows = await db
      .select({
        id: drugClassifications.id,
        slug: drugClassifications.slug,
        nameEn: drugClassifications.nameEn,
        nameBn: drugClassifications.nameBn,
        emoji: drugClassifications.emoji,
        descriptionEn: drugClassifications.descriptionEn,
        descriptionBn: drugClassifications.descriptionBn,
        sort: drugClassifications.sort,
        showOnMenu: drugClassifications.showOnMenu,
        showOnHomepage: drugClassifications.showOnHomepage,
        isActive: drugClassifications.isActive,
      })
      .from(drugClassifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(drugClassifications.sort), asc(drugClassifications.nameEn));

    if (rows && rows.length > 0) {
      return rows;
    }

    // Fallback
    let fallback = DEFAULT_DRUG_CLASSIFICATIONS;
    if (opts?.showOnMenu !== undefined) {
      fallback = fallback.filter((d) => d.showOnMenu === opts.showOnMenu);
    }
    if (opts?.isActive !== undefined) {
      fallback = fallback.filter((d) => d.isActive === opts.isActive);
    }
    return fallback;
  } catch (err) {
    console.warn('[listDrugClassifications] DB fetch failed, returning static fallback:', err);
    let fallback = DEFAULT_DRUG_CLASSIFICATIONS;
    if (opts?.showOnMenu !== undefined) {
      fallback = fallback.filter((d) => d.showOnMenu === opts.showOnMenu);
    }
    return fallback;
  }
}

/**
 * Get a single classification by slug.
 */
export async function getDrugClassificationBySlug(slug: string) {
  await ensureDrugClassificationsTable();
  const [item] = await db
    .select()
    .from(drugClassifications)
    .where(eq(drugClassifications.slug, slug))
    .limit(1);

  return item || null;
}
