/**
 * One-time script: copies product + species image URLs from Frankfurt to Ohio.
 * Run AFTER db:migrate, BEFORE db:seed.
 *
 * Run: FRANKFURT_URL="postgresql://..." npm run db:transfer-images
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Client } from 'pg';
import { neon } from '@neondatabase/serverless';

const frankfurtUrl = process.env.FRANKFURT_URL;
if (!frankfurtUrl) {
  console.error('❌  Set FRANKFURT_URL env var to the Frankfurt connection string.');
  process.exit(1);
}

async function main() {
  console.log('\n📦 Transferring images from Frankfurt → Ohio\n');

  const src = new Client({ connectionString: frankfurtUrl, ssl: { rejectUnauthorized: false } });
  await src.connect();
  const dst = neon(process.env.DATABASE_URL!);

  // Products
  const products = await src.query<{ slug: string; image_url: string }>(
    `SELECT slug, image_url FROM products WHERE image_url IS NOT NULL`
  );
  console.log(`🖼  Products with images in Frankfurt: ${products.rows.length}`);
  let pUpdated = 0;
  for (const row of products.rows) {
    await dst`UPDATE products SET image_url = ${row.image_url} WHERE slug = ${row.slug}`;
    pUpdated++;
  }
  console.log(`   → ${pUpdated} product images copied`);

  // Species
  const species = await src.query<{ scientific_name: string; image_url: string }>(
    `SELECT scientific_name, image_url FROM plant_species WHERE image_url IS NOT NULL`
  );
  console.log(`🌿  Species with images in Frankfurt: ${species.rows.length}`);
  let sUpdated = 0;
  for (const row of species.rows) {
    await dst`UPDATE plant_species SET image_url = ${row.image_url} WHERE scientific_name = ${row.scientific_name}`;
    sUpdated++;
  }
  console.log(`   → ${sUpdated} species images copied`);

  await src.end();
  console.log('\n✅ Done. Run npm run db:seed next.\n');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
