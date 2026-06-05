import { and, eq, isNull } from 'drizzle-orm';
import { db, chunkInsert } from './seed-utils';
import * as schema from '../src/lib/db/schema';
import { CATEGORY_QUERIES, fetchPexelsPhotos } from './update-product-images';

type ProductCategory = typeof schema.productCategoryEnum.enumValues[number];

interface ProductData {
  nameBg: string; nameEn: string;
  descriptionBg: string | null; descriptionEn: string | null;
  price: string; category: ProductCategory; stock: number; slug: string;
}

/**
 * Idempotent: inserts any products from products-data.ts not already present
 * (matched by unique slug), then assigns images to products missing one —
 * real Pexels photos per category, falling back to species photos.
 */
export async function seedProducts() {
  let PRODUCTS_DATA: ProductData[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    PRODUCTS_DATA = require('./products-data').PRODUCTS_DATA;
    console.log(`🌸 Loaded ${PRODUCTS_DATA.length} products from products-data.ts`);
  } catch {
    console.warn('⚠  products-data.ts not found — skipping product insert');
  }

  // 1. Insert only the products that don't exist yet (by slug)
  const existing = await db.select({ slug: schema.products.slug }).from(schema.products);
  const have = new Set(existing.map((p) => p.slug));
  const toInsert = PRODUCTS_DATA.filter((p) => !have.has(p.slug)).map((p) => ({
    nameBg:        p.nameBg,
    nameEn:        p.nameEn,
    descriptionBg: p.descriptionBg,
    descriptionEn: p.descriptionEn,
    price:         p.price,
    category:      p.category,
    stock:         p.stock,
    isActive:      true,
    slug:          p.slug,
    imageUrl:      null as string | null,
  }));
  if (toInsert.length) await chunkInsert(schema.products, toInsert, 500);
  console.log(`   → ${have.size} existing, +${toInsert.length} inserted`);

  // 2. Fill in any missing images
  await assignProductImages();

  return db
    .select({ id: schema.products.id, price: schema.products.price })
    .from(schema.products);
}

/** Assigns images to products with image_url = null, per category. */
export async function assignProductImages() {
  // Species photos serve as the fallback pool when Pexels has no key / no hits
  const speciesPool = (
    await db.select({ imageUrl: schema.plantSpecies.imageUrl }).from(schema.plantSpecies)
  )
    .map((s) => s.imageUrl)
    .filter((u): u is string => !!u);

  for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
    const cat = category as ProductCategory;
    const missing = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(and(eq(schema.products.category, cat), isNull(schema.products.imageUrl)));
    if (!missing.length) continue;

    const pexels: string[] = [];
    for (const [query, count] of queries) {
      pexels.push(...(await fetchPexelsPhotos(query, count)));
    }
    const photos = pexels.length ? pexels : speciesPool;
    if (!photos.length) {
      console.log(`   🖼  ${category}: no photos available — left blank`);
      continue;
    }

    const updates = missing.map((p, i) => ({ id: p.id, imageUrl: photos[i % photos.length] }));
    for (let i = 0; i < updates.length; i += 200) {
      await Promise.all(
        updates.slice(i, i + 200).map((u) =>
          db.update(schema.products).set({ imageUrl: u.imageUrl }).where(eq(schema.products.id, u.id))
        )
      );
    }
    console.log(`   🖼  ${category}: ${updates.length} imaged (${pexels.length ? 'pexels' : 'species fallback'})`);
  }
}

if (require.main === module) {
  seedProducts()
    .then(() => process.exit(0))
    .catch((err) => { console.error('❌', err.message); process.exit(1); });
}
