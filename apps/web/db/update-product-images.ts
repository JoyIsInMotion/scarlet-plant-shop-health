/**
 * Fetches real product-quality photos from Pexels and assigns them to
 * every product in the DB, grouped by category and product type.
 *
 * Setup:  add  PEXELS_API_KEY=your_key  to apps/web/.env.local
 * Get key: https://www.pexels.com/api/ (free, no credit card)
 *
 * Run:    npm run db:product-images
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';

const PEXELS_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_KEY) {
  console.error('❌  PEXELS_API_KEY is not set in .env.local');
  console.error('   Get a free key at https://www.pexels.com/api/');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const db  = drizzle(sql, { schema });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const RATE_MS = 300; // Pexels allows 200 req/hour — stay comfortable

// ── Pexels photo fetcher ──────────────────────────────────────────────────────

interface PexelsPhoto {
  src: { medium: string; large: string };
}

async function fetchPexelsPhotos(query: string, count = 8): Promise<string[]> {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(Math.min(count, 15)));
  url.searchParams.set('orientation', 'square');

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: PEXELS_KEY! },
    });
    await sleep(RATE_MS);
    if (!res.ok) {
      console.error(`   Pexels error ${res.status}: ${await res.text()}`);
      return [];
    }
    const data = await res.json() as { photos: PexelsPhoto[] };
    return data.photos.map(p => p.src.large || p.src.medium);
  } catch (err) {
    console.error(`   Fetch error: ${err}`);
    await sleep(1000);
    return [];
  }
}

// ── Search term map ───────────────────────────────────────────────────────────
// Each category lists [search term, how many photos to pull].
// Products cycle through the collected photos for that category.

const CATEGORY_QUERIES: Record<string, Array<[string, number]>> = {

  bouquet: [
    ['red rose bouquet',       8],
    ['pink rose bouquet',      6],
    ['white rose bouquet',     5],
    ['tulip bouquet flowers',  6],
    ['sunflower bouquet',      5],
    ['mixed flower bouquet',   8],
    ['purple lilac bouquet',   5],
    ['gerbera daisy bouquet',  5],
    ['lily flower arrangement',5],
    ['peony bouquet flowers',  5],
    ['lavender flower bunch',  4],
    ['daisy flower bouquet',   4],
    ['chrysanthemum bouquet',  4],
    ['spring flower bouquet',  5],
    ['luxury flower arrangement', 5],
  ],

  potted_plant: [
    ['monstera plant pot',         6],
    ['peace lily pot indoor',      5],
    ['snake plant indoor',         5],
    ['pothos plant hanging',       5],
    ['philodendron potted plant',  4],
    ['fiddle leaf fig plant',      4],
    ['rubber plant indoor',        4],
    ['areca palm plant',           4],
    ['indoor tropical plant pot',  5],
    ['green plant ceramic pot',    5],
    ['ZZ plant indoor pot',        4],
    ['anthurium red flower pot',   4],
  ],

  succulent: [
    ['echeveria succulent pot',      6],
    ['succulent arrangement pot',    8],
    ['cactus succulent terracotta',  6],
    ['mixed succulents bowl',        5],
    ['aloe vera plant pot',          5],
    ['jade plant succulent',         4],
    ['haworthia succulent',          4],
    ['colorful succulent garden',    5],
  ],

  tropical: [
    ['bird of paradise plant',      6],
    ['monstera adansonii tropical', 5],
    ['tropical plant large leaf',   6],
    ['alocasia tropical plant',     5],
    ['heliconia tropical flower',   5],
    ['areca palm tropical',         4],
    ['bromeliad tropical plant',    4],
  ],

  seasonal: [
    ['spring tulip pot decoration', 5],
    ['poinsettia christmas plant',  5],
    ['easter hyacinth flowers',     5],
    ['spring flower arrangement',   5],
    ['valentines rose bouquet',     4],
    ['mothers day flower gift',     4],
    ['autumn flower arrangement',   4],
    ['holiday flower centerpiece',  4],
  ],

  accessories: [
    ['terracotta plant pot',        6],
    ['ceramic flower pot',          5],
    ['watering can garden',         5],
    ['plant pot set home',          5],
    ['garden tools planting',       4],
    ['succulent mini pot set',      4],
    ['plant label garden',          3],
  ],
};

// ── DB helpers ────────────────────────────────────────────────────────────────

async function updateBatch(rows: Array<{ id: string; imageUrl: string }>) {
  for (let i = 0; i < rows.length; i += 200) {
    await Promise.all(
      rows.slice(i, i + 200).map(({ id, imageUrl }) =>
        db.update(schema.products).set({ imageUrl }).where(eq(schema.products.id, id))
      )
    );
    process.stdout.write(`\r   Updated ${Math.min(i + 200, rows.length)} / ${rows.length} products`);
  }
  process.stdout.write('\n');
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌸 Fetching real product photos from Pexels…\n');

  let totalUpdated = 0;

  for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
    console.log(`\n📂 ${category}`);

    const photos: string[] = [];
    for (const [query, count] of queries) {
      process.stdout.write(`   Searching "${query}"… `);
      const results = await fetchPexelsPhotos(query, count);
      photos.push(...results);
      console.log(`${results.length} photos`);
    }

    if (photos.length === 0) {
      console.log('   ⚠  No photos found — skipping');
      continue;
    }

    const products = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.category, category as typeof schema.productCategoryEnum.enumValues[number]));

    const updates = products.map((p, i) => ({
      id:       p.id,
      imageUrl: photos[i % photos.length],
    }));

    await updateBatch(updates);
    totalUpdated += updates.length;
    console.log(`   ✅ ${updates.length} products · ${photos.length} unique Pexels photos cycling`);
  }

  console.log(`\n✅ Done — ${totalUpdated} products updated with real product photos.`);
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
