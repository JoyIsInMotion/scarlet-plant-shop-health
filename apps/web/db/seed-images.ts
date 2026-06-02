/**
 * Image migration script — iNaturalist edition.
 *
 * Queries the iNaturalist API (no key required) for each plant species,
 * downloads the observation photo, uploads it to Cloudflare R2, and
 * overwrites images.ts with the resulting R2 URLs.
 *
 * Run:  npm run db:seed-images
 * Then: npm run db:seed
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { writeFileSync } from 'fs';
import { join } from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PRODUCT_IMAGES } from './images';

// ── R2 ────────────────────────────────────────────────────────────────────────

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const BASE   = process.env.R2_PUBLIC_URL!;

// ── All 100 species: [scientificName, commonName] ─────────────────────────────

const SPECIES: [string, string][] = [
  // EASY
  ['Sansevieria trifasciata',   'Snake Plant'],
  ['Epipremnum aureum',         'Golden Pothos'],
  ['Chlorophytum comosum',      'Spider Plant'],
  ['Zamioculcas zamiifolia',    'ZZ Plant'],
  ['Aloe vera',                 'Aloe Vera'],
  ['Dracaena marginata',        'Dragon Tree'],
  ['Crassula ovata',            'Jade Plant'],
  ['Sedum morganianum',         "Burro's Tail"],
  ['Echeveria elegans',         'Echeveria elegans'],
  ['Haworthia fasciata',        'Zebra Haworthia'],
  ['Schlumbergera truncata',    'Christmas Cactus'],
  ['Tradescantia zebrina',      'Inch Plant'],
  ['Ficus benjamina',           'Weeping Fig'],
  ['Dracaena fragrans',         'Corn Plant'],
  ['Aglaonema commutatum',      'Chinese Evergreen'],
  ['Spathiphyllum wallisii',    'Peace Lily'],
  ['Aspidistra elatior',        'Cast Iron Plant'],
  ['Sansevieria cylindrica',    'Cylindrical Snake Plant'],
  ['Rhapis excelsa',            'Lady Palm'],
  ['Chamaedorea elegans',       'Parlor Palm'],
  ['Pachira aquatica',          'Money Tree'],
  ['Beaucarnea recurvata',      'Ponytail Palm'],
  ['Kalanchoe blossfeldiana',   'Flaming Katy'],
  ['Portulacaria afra',         'Elephant Bush'],
  ['Opuntia microdasys',        'Bunny Ears Cactus'],
  ['Mammillaria elongata',      'Ladyfinger Cactus'],
  ['Cereus peruvianus',         'Peruvian Apple Cactus'],
  ['Peperomia obtusifolia',     'Baby Rubber Plant'],
  ['Peperomia argyreia',        'Watermelon Peperomia'],
  ['Fatsia japonica',           'Japanese Aralia'],
  ['Pelargonium x hortorum',    'Garden Geranium'],
  ['Tagetes erecta',            'African Marigold'],
  ['Zinnia elegans',            'Zinnia'],
  ['Calendula officinalis',     'Pot Marigold'],
  ['Impatiens walleriana',      'Busy Lizzie'],
  // MODERATE
  ['Monstera deliciosa',        'Monstera'],
  ['Monstera adansonii',        'Swiss Cheese Vine'],
  ['Ficus lyrata',              'Fiddle Leaf Fig'],
  ['Philodendron hederaceum',   'Heartleaf Philodendron'],
  ['Calathea orbifolia',        'Calathea orbifolia'],
  ['Calathea zebrina',          'Zebra Plant Calathea'],
  ['Maranta leuconeura',        'Prayer Plant'],
  ['Strelitzia reginae',        'Bird of Paradise'],
  ['Alocasia amazonica',        'Elephant Ear Alocasia'],
  ['Anthurium andraeanum',      'Flamingo Flower'],
  ['Hoya carnosa',              'Wax Plant'],
  ['Pilea peperomioides',       'Chinese Money Plant'],
  ['Oxalis triangularis',       'Purple Shamrock'],
  ['Begonia rex',               'Rex Begonia'],
  ['Begonia maculata',          'Polka Dot Begonia'],
  ['Scindapsus pictus',         'Satin Pothos'],
  ['Syngonium podophyllum',     'Arrowhead Plant'],
  ['Fittonia albivenis',        'Nerve Plant'],
  ['Peperomia caperata',        'Ripple Peperomia'],
  ['Dypsis lutescens',          'Areca Palm'],
  ['Howea forsteriana',         'Kentia Palm'],
  ['Ficus elastica',            'Rubber Plant'],
  ['Calathea roseopicta',       'Rose Painted Calathea'],
  ['Guzmania lingulata',        'Scarlet Star Bromeliad'],
  ['Tillandsia ionantha',       'Air Plant ionantha'],
  ['Tillandsia xerographica',   'Air Plant xerographica'],
  ['Aechmea fasciata',          'Urn Plant Bromeliad'],
  ['Cyclamen persicum',         'Persian Cyclamen'],
  ['Primula vulgaris',          'Common Primrose'],
  ['Rosa chinensis',            'China Rose'],
  ['Dahlia pinnata',            'Dahlia'],
  ['Chrysanthemum morifolium',  'Florist Chrysanthemum'],
  ['Gerbera jamesonii',         'Barberton Daisy'],
  ['Tulipa gesneriana',         'Garden Tulip'],
  ['Lilium longiflorum',        'Easter Lily'],
  ['Narcissus pseudonarcissus', 'Daffodil'],
  ['Hyacinthus orientalis',     'Common Hyacinth'],
  ['Iris germanica',            'Bearded Iris'],
  ['Helianthus annuus',         'Sunflower'],
  ['Lavandula angustifolia',    'English Lavender'],
  ['Rosa damascena',            'Damask Rose'],
  ['Aloe arborescens',          'Tree Aloe'],
  ['Vriesea splendens',         'Flaming Sword Bromeliad'],
  ['Tradescantia fluminensis',  'Wandering Jew'],
  // DIFFICULT
  ['Phalaenopsis amabilis',     'Moth Orchid'],
  ['Dendrobium nobile',         'Noble Dendrobium'],
  ['Cattleya labiata',          'Corsage Orchid'],
  ['Cymbidium aloifolium',      'Boat Orchid'],
  ['Calathea warscewiczii',     'Jungle Velvet Calathea'],
  ['Calathea ornata',           'Pinstripe Calathea'],
  ['Alocasia zebrina',          'Zebra Alocasia'],
  ['Anthurium clarinervium',    'Velvet Anthurium'],
  ['Caladium bicolor',          'Caladium bicolor'],
  ['Monstera obliqua',          'Monstera obliqua'],
  ['Philodendron gloriosum',    'Gloriosum Philodendron'],
  ['Stromanthe sanguinea',      'Tricolor Stromanthe'],
  ['Dionaea muscipula',         'Venus Flytrap'],
  ['Nepenthes ventricosa',      'Pitcher Plant'],
  ['Vanda coerulea',            'Blue Vanda Orchid'],
  ['Paphiopedilum insigne',     "Lady's Slipper Orchid"],
  ['Miltoniopsis vexillaria',   'Pansy Orchid'],
  ['Medinilla magnifica',       'Rose Grape'],
  ['Heliconia psittacorum',     'Parrot Flower'],
  ['Vanilla planifolia',        'Vanilla Orchid'],
  ['Adenium obesum',            'Desert Rose'],
];

// ── helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function contentTypeOf(url: string): string {
  if (/\.png([\?#]|$)/i.test(url)) return 'image/png';
  if (/\.webp([\?#]|$)/i.test(url)) return 'image/webp';
  return 'image/jpeg';
}

// ── iNaturalist ───────────────────────────────────────────────────────────────

interface INatResult {
  name: string;
  default_photo?: {
    medium_url?: string;
    url?: string;
  };
}

async function fetchINatImage(scientificName: string, commonName: string): Promise<string | null> {
  // Try scientific name first, then common name as fallback
  for (const q of [scientificName, commonName]) {
    try {
      const url = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=5&rank=species`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'ScarletPlantShop-Seeder/1.0 (educational project)' },
      });
      await sleep(700); // stay well under iNaturalist rate limit

      if (!res.ok) continue;
      const data = await res.json() as { results: INatResult[] };
      if (!data.results?.length) continue;

      // Prefer exact scientific name match; else take first result
      const sciLower = scientificName.toLowerCase();
      const best =
        data.results.find(r => r.name.toLowerCase() === sciLower) ??
        data.results.find(r => r.name.toLowerCase().startsWith(sciLower.split(' ').slice(0, 2).join(' '))) ??
        data.results[0];

      const photo = best?.default_photo?.medium_url ?? best?.default_photo?.url;
      if (photo) return photo;
    } catch {
      await sleep(1000);
    }
  }
  return null;
}

// ── R2 helpers ────────────────────────────────────────────────────────────────

async function downloadBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ScarletPlantShop-Seeder/1.0' },
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function putR2(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  return `${BASE}/${key}`;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌿 Scarlet seed-images — real plant photos via iNaturalist\n');

  if (!BUCKET || !BASE) {
    console.error('❌  Missing R2_BUCKET_NAME or R2_PUBLIC_URL in .env.local');
    process.exit(1);
  }

  const downloadCache = new Map<string, Buffer | null>();
  const speciesOut: Record<string, string> = {};
  const productOut: Record<string, string> = {};

  let speciesDone = 0;
  let speciesFailed = 0;

  // ── species ───────────────────────────────────────────────────────────────
  console.log(`📷  Processing ${SPECIES.length} species (iNaturalist, ~${Math.ceil(SPECIES.length * 0.7 / 60)} min)…\n`);

  for (let i = 0; i < SPECIES.length; i++) {
    const [scientificName, commonName] = SPECIES[i];
    const slug = toSlug(scientificName);

    process.stdout.write(`  [${String(i + 1).padStart(3)}/${SPECIES.length}] ${scientificName.padEnd(36)} `);

    // 1. Look up photo URL from iNaturalist
    const imageUrl = await fetchINatImage(scientificName, commonName);
    if (!imageUrl) {
      console.log('⚠  not found on iNaturalist');
      speciesFailed++;
      continue;
    }

    // 2. Download (cached so shared URLs only fetch once)
    if (!downloadCache.has(imageUrl)) {
      downloadCache.set(imageUrl, await downloadBuffer(imageUrl));
    }
    const buf = downloadCache.get(imageUrl)!;
    if (!buf) {
      console.log('⚠  download failed');
      speciesFailed++;
      continue;
    }

    // 3. Upload to R2
    const key = `species/${slug}.jpg`;
    try {
      const r2Url = await putR2(key, buf, contentTypeOf(imageUrl));
      speciesOut[scientificName] = r2Url;
      speciesDone++;
      console.log('✓');
    } catch (err) {
      console.log(`✗  R2 error: ${err}`);
      speciesOut[scientificName] = imageUrl;
      speciesFailed++;
    }
  }

  console.log(`\n   ✅ ${speciesDone} uploaded  ⚠  ${speciesFailed} skipped\n`);

  // ── products ──────────────────────────────────────────────────────────────
  const productEntries = Object.entries(PRODUCT_IMAGES);
  console.log(`📷  Processing ${productEntries.length} product images (Unsplash)…\n`);

  let productsDone = 0;

  for (const [slug, url] of productEntries) {
    process.stdout.write(`  ${slug.padEnd(36)} `);

    if (!downloadCache.has(url)) {
      downloadCache.set(url, await downloadBuffer(url));
    }
    const buf = downloadCache.get(url)!;
    if (!buf) {
      console.log('⚠  download failed — keeping original URL');
      productOut[slug] = url;
      continue;
    }

    try {
      const r2Url = await putR2(`products/${slug}.jpg`, buf, 'image/jpeg');
      productOut[slug] = r2Url;
      productsDone++;
      console.log('✓');
    } catch (err) {
      console.log(`✗  ${err}`);
      productOut[slug] = url;
    }
  }

  console.log(`\n   ✅ ${productsDone} uploaded\n`);

  // ── write images.ts ───────────────────────────────────────────────────────
  const speciesLines = SPECIES
    .filter(([name]) => speciesOut[name])
    .map(([name]) => `  '${name}': '${speciesOut[name]}',`)
    .join('\n');

  const productLines = Object.entries(productOut)
    .map(([k, v]) => `  '${k}': '${v}',`)
    .join('\n');

  const content = `// Auto-generated by db/seed-images.ts — do not edit manually.
// Re-run \`npm run db:seed-images\` to refresh.

export const SPECIES_IMAGES: Record<string, string> = {
${speciesLines}
};

export const PRODUCT_IMAGES: Record<string, string> = {
${productLines}
};
`;

  const outPath = join(__dirname, 'images.ts');
  writeFileSync(outPath, content, 'utf8');

  console.log(`📝  Wrote ${outPath}`);
  console.log('👉  Next:  npm run db:seed\n');
}

main().catch(err => {
  console.error('❌  seed-images failed:', err);
  process.exit(1);
});
