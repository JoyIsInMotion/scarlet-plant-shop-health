/**
 * Fills missing species photos for every plant_species row where image_url IS NULL.
 * Uses Wikipedia Commons first (same source as existing species — free hotlinking).
 * Falls back to iNaturalist open-data S3 URLs (also hotlink-safe).
 * Never touches rows that already have a photo.
 *
 * Run (preview): npm run db:refill-species-images -- --preview
 * Run (apply):   npm run db:refill-species-images
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { isNull, eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const PREVIEW = process.argv.includes('--preview');

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const { plantSpecies } = schema;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWikipediaPhoto(scientificName: string): Promise<string | null> {
  try {
    const title = encodeURIComponent(scientificName);
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${title}&prop=pageimages&format=json&pithumbsize=800&redirects=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'scarlet-plant-shop/1.0 (educational project)' } });
    if (res.status === 429) { process.stdout.write('[wiki 429, waiting] '); await sleep(5000); return null; }
    if (!res.ok) return null;
    const json = await res.json() as {
      query?: { pages?: Record<string, { thumbnail?: { source: string } }> };
    };
    const page = Object.values(json.query?.pages ?? {})[0];
    const photo = page?.thumbnail?.source ?? null;
    // Wikipedia thumbnails can point to any domain — only keep Wikimedia-hosted ones
    if (photo && !photo.includes('upload.wikimedia.org')) return null;
    return photo;
  } catch {
    return null;
  }
}

async function fetchInatPhoto(scientificName: string): Promise<string | null> {
  try {
    const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(scientificName)}&per_page=3&rank=species,genus`;
    const res = await fetch(url, { headers: { 'User-Agent': 'scarlet-plant-shop/1.0 (educational project)' } });
    if (res.status === 429) { process.stdout.write('[inat 429, waiting 30s] '); await sleep(30000); return null; }
    if (!res.ok) { process.stdout.write(`[inat ${res.status}] `); return null; }
    const json = await res.json() as {
      results?: Array<{ name: string; default_photo?: { medium_url?: string } }>;
    };
    for (const taxon of json.results ?? []) {
      if (!taxon.name.toLowerCase().startsWith(scientificName.split(' ')[0].toLowerCase())) continue;
      const photo = taxon.default_photo?.medium_url;
      // Only accept open S3 URLs — static.inaturalist.org blocks hotlinking
      if (photo && photo.includes('s3.amazonaws.com')) {
        return photo.replace('/square.', '/medium.').replace('/thumb.', '/medium.');
      }
    }
  } catch (e) {
    process.stdout.write(`[inat err: ${e}] `);
  }
  return null;
}

async function fetchPhoto(scientificName: string): Promise<{ url: string; src: 'wiki' | 'inat' } | null> {
  const wiki = await fetchWikipediaPhoto(scientificName);
  await sleep(800);
  if (wiki) return { url: wiki, src: 'wiki' };

  const inat = await fetchInatPhoto(scientificName);
  await sleep(1200);
  if (inat) return { url: inat, src: 'inat' };

  return null;
}

async function main() {
  console.log('\n🌿 Refilling missing species photos (Wikipedia → iNaturalist S3)\n');

  const missing = await db
    .select({ id: plantSpecies.id, scientificName: plantSpecies.scientificName })
    .from(plantSpecies)
    .where(isNull(plantSpecies.imageUrl));

  if (missing.length === 0) {
    console.log('✅ All species already have photos — nothing to do.');
    return;
  }

  console.log(`Found ${missing.length} species with no photo.${PREVIEW ? ' (PREVIEW — no DB writes)' : ''}\n`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const { id, scientificName } = missing[i];
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${missing.length}] ${scientificName.padEnd(38)} `);

    const result = await fetchPhoto(scientificName);

    if (!result) {
      console.log('✗ not found');
      failed++;
      continue;
    }

    if (!PREVIEW) {
      await db.update(plantSpecies).set({ imageUrl: result.url }).where(eq(plantSpecies.id, id));
    }

    ok++;
    console.log(`✓ [${result.src}] ${result.url}`);
  }

  if (PREVIEW) {
    console.log(`\nWould update ${ok}/${missing.length}. Run without --preview to apply.\n`);
  } else {
    console.log(`\n✅ ${ok} updated   ✗ ${failed} not found\n`);
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
