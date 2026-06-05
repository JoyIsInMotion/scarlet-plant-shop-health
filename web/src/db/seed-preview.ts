/**
 * Preview seed — inserts a small sample of the new plant data WITHOUT clearing
 * any existing data. Use this to verify the UI looks correct before running
 * the full db:seed.
 *
 * Run:  npm run db:seed-preview
 * Undo: npm run db:seed-preview -- --remove   (deletes the preview rows)
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { inArray } from 'drizzle-orm';
import * as schema from './schema';
import { getCategoryForSpecies } from './plant-categories';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const sql  = neon(process.env.DATABASE_URL!);
const db   = drizzle(sql, { schema });

const ID_FILE = join(__dirname, '.preview-ids.json');

async function main() {
  const remove = process.argv.includes('--remove');

  if (remove) {
    // Try ID file first (new approach), fall back to __PREVIEW__ prefix (old approach)
    if (existsSync(ID_FILE)) {
      const ids: string[] = JSON.parse(readFileSync(ID_FILE, 'utf8'));
      const deleted = await db.delete(schema.plantSpecies)
        .where(inArray(schema.plantSpecies.id, ids))
        .returning({ name: schema.plantSpecies.scientificName });
      console.log(`🗑  Removed ${deleted.length} preview plants (by ID)`);
    } else {
      // Legacy: delete by __PREVIEW__ prefix in scientific name
      const { ilike } = await import('drizzle-orm');
      const deleted = await db.delete(schema.plantSpecies)
        .where(ilike(schema.plantSpecies.scientificName, '__PREVIEW__%'))
        .returning({ name: schema.plantSpecies.scientificName });
      console.log(`🗑  Removed ${deleted.length} preview plants (by prefix)`);
    }
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SPECIES_DATA } = require('./species-data') as { SPECIES_DATA: Array<{
    scientificName: string; commonNameEn: string | null; commonNameBg: string | null;
    family: string | null; nativeRegionEn: string | null; nativeRegionBg: string | null;
    imageUrl: string | null; descriptionEn: string | null; descriptionBg: string | null;
    careDifficulty: 'easy' | 'moderate' | 'difficult';
    wateringIntervalDays: number; fertilizingIntervalDays: number;
    repottingIntervalMonths: number; mistingNeeded: boolean;
    isToxicToPets: boolean | null;
    careGuide: Record<string, { en: string; bg: string }> | null;
  }> };

  // Pick 8 diverse plants: indoor, succulent, herb, garden, toxic, safe
  const picks = [
    'Monstera deliciosa',
    'Sansevieria trifasciata',
    'Spathiphyllum wallisii',
    'Echeveria elegans',
    'Lavandula angustifolia',
    'Rosa canina',
    'Phalaenopsis amabilis',
    'Solanum lycopersicum',
  ];

  const rows = picks
    .map(name => SPECIES_DATA.find(s => s.scientificName === name))
    .filter(Boolean)
    .map(s => ({
      scientificName:          s!.scientificName,
      commonNameEn:            s!.commonNameEn,
      commonNameBg:            s!.commonNameBg,
      family:                  s!.family,
      nativeRegionEn:          s!.nativeRegionEn,
      nativeRegionBg:          s!.nativeRegionBg,
      descriptionEn:           s!.descriptionEn,
      descriptionBg:           s!.descriptionBg,
      careDifficulty:          s!.careDifficulty,
      category:                getCategoryForSpecies(s!.scientificName),
      careGuide:               s!.careGuide,
      imageUrl:                s!.imageUrl,
      isVerified:              true,
      wateringIntervalDays:    s!.wateringIntervalDays,
      fertilizingIntervalDays: s!.fertilizingIntervalDays,
      repottingIntervalMonths: s!.repottingIntervalMonths,
      mistingNeeded:           s!.mistingNeeded,
      isToxicToPets:           s!.isToxicToPets ?? null,
    }));

  const inserted = await db.insert(schema.plantSpecies).values(rows).returning({ id: schema.plantSpecies.id });
  writeFileSync(ID_FILE, JSON.stringify(inserted.map(r => r.id)));

  console.log(`✅ Inserted ${rows.length} preview plants into the catalog`);
  console.log('👉 Open the app → Catalog to review the data');
  console.log('   When done: npm run db:seed-preview -- --remove');
  rows.forEach(r => console.log(`   • ${r.commonNameBg ?? r.commonNameEn} (${r.scientificName})`));
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
