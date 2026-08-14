import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vetmart';

async function checkStock() {
  const pg = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(pg, { schema });

  const products = await db.select().from(schema.products);
  const categories = await db.select().from(schema.categories);
  const manufacturers = await db.select().from(schema.manufacturers);

  console.log(`\nFound ${products.length} Products in Database:\n`);

  for (const product of products) {
    const ledger = await db.select().from(schema.stockLedger).where(eq(schema.stockLedger.productId, product.id));
    const currentStock = ledger.reduce((acc, entry) => acc + entry.delta, 0);

    const images = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, product.id));

    const cat = categories.find(c => c.id === product.categoryId);
    const mfg = manufacturers.find(m => m.id === product.manufacturerId);

    console.log(`- ${product.nameEn} (${product.sku})`);
    console.log(`  Category: ${cat?.nameEn}`);
    console.log(`  Manufacturer: ${mfg?.name}`);
    console.log(`  Price: ৳${(product.salePrice / 100).toFixed(2)}`);
    console.log(`  Current Stock: ${currentStock} units`);
    console.log(`  Images: ${images.length > 0 ? images[0].basePath : 'None'}`);
    console.log('');
  }

  await pg.end();
}

checkStock().catch(console.error);
