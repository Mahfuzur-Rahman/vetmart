// scripts/delete-products.ts
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = path.resolve('.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('DATABASE_URL=')) {
          return trimmed.replace('DATABASE_URL=', '').trim();
        }
      }
    }
  } catch {}
  return 'postgresql://user:pass@localhost:5432/vetmart';
}

const DATABASE_URL = getDatabaseUrl();

async function main() {
  console.log('🗑️ Deleting all products, batches, stock ledgers, and images from database...');
  const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 10 });

  try {
    // Delete in dependency order (or cascade)
    await sql`DELETE FROM cart_items`;
    await sql`DELETE FROM stock_ledger`;
    await sql`DELETE FROM product_reviews`;
    await sql`DELETE FROM product_batches`;
    await sql`DELETE FROM product_images`;
    const deletedProducts = await sql`DELETE FROM products RETURNING id, name_en`;

    console.log(`✅ Successfully deleted ${deletedProducts.length} products from PostgreSQL database:`);
    for (const p of deletedProducts) {
      console.log(` - Deleted: ${p.name_en} (${p.id})`);
    }

    const remaining = await sql`SELECT count(*)::int as count FROM products`;
    console.log(`📊 Products remaining in database: ${remaining[0].count}`);
  } catch (err: any) {
    console.error('❌ Error deleting products:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
