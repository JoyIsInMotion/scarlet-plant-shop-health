import { db, chunkInsert } from './seed-utils';
import * as schema from '../src/lib/db/schema';
import { getCategoryForSpecies } from './plant-categories';

export function careGuideFallback(d: 'easy' | 'moderate' | 'difficult') {
  const g = {
    easy: {
      light:       { en: 'Tolerates low to bright indirect light.',           bg: 'Понася слаба до ярка непряка светлина.' },
      watering:    { en: 'Water every 1–2 weeks; let soil dry completely.',   bg: 'Поливайте на 1–2 седмици; оставете почвата да изсъхне.' },
      humidity:    { en: 'Average household humidity (30–50%) is fine.',      bg: 'Достатъчна е нормална домашна влажност (30–50%).' },
      temperature: { en: 'Ideal 15–30 °C; avoid frost.',                      bg: 'Идеална 15–30 °C; избягвайте замръзване.' },
      fertilizer:  { en: 'Fertilize once a month during spring and summer.',  bg: 'Торете веднъж месечно през пролетта и лятото.' },
      toxicity:    { en: 'Toxicity unknown; keep out of reach as precaution.', bg: 'Токсичността е неизвестна; пазете от домашни любимци.' },
    },
    moderate: {
      light:       { en: 'Prefers bright indirect light.',                    bg: 'Предпочита ярка непряка светлина.' },
      watering:    { en: 'Water when top inch of soil is dry.',               bg: 'Поливайте когато горният сантиметър почва изсъхне.' },
      humidity:    { en: 'Benefits from moderate to high humidity (40–60%).', bg: 'Обича умерена до висока влажност на въздуха (40–60%).' },
      temperature: { en: 'Ideal 18–27 °C; protect from cold drafts.',        bg: 'Идеална 18–27 °C; пазете от студени течения.' },
      fertilizer:  { en: 'Fertilize every 2–4 weeks during growing season.', bg: 'Торете на 2–4 седмици по време на растеж.' },
      toxicity:    { en: 'Toxicity unknown; keep out of reach as precaution.', bg: 'Токсичността е неизвестна; пазете от домашни любимци.' },
    },
    difficult: {
      light:       { en: 'Requires bright indirect or filtered light.',       bg: 'Изисква ярка непряка или филтрирана светлина.' },
      watering:    { en: 'Careful watering; let top third of soil dry.',      bg: 'Внимателно поливане; оставяйте горната трета почва да изсъхне.' },
      humidity:    { en: 'Requires high humidity 60–80%; use humidifier.',    bg: 'Изисква висока влажност 60–80%; използвайте овлажнител.' },
      temperature: { en: 'Maintain 20–28 °C consistently.',                  bg: 'Поддържайте постоянно 20–28 °C.' },
      fertilizer:  { en: 'Half-strength fertilizer weekly during growth.',   bg: 'Торете седмично с половин доза по време на активен растеж.' },
      toxicity:    { en: 'Toxicity unknown; keep out of reach as precaution.', bg: 'Токсичността е неизвестна; пазете от домашни любимци.' },
    },
  };
  return g[d];
}

export async function seedSpecies() {
  let SPECIES_DATA: Array<{
    scientificName: string; commonNameEn: string | null; commonNameBg: string | null;
    family: string | null; nativeRegionEn: string | null; nativeRegionBg: string | null;
    imageUrl: string | null; descriptionEn: string | null; descriptionBg: string | null;
    careDifficulty: 'easy' | 'moderate' | 'difficult';
    wateringIntervalDays: number; fertilizingIntervalDays: number;
    repottingIntervalMonths: number; mistingNeeded: boolean;
    isToxicToPets: boolean | null;
    careGuide: Record<string, { en: string; bg: string }> | null;
  }> = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SPECIES_DATA = require('./species-data').SPECIES_DATA;
    console.log(`🌿 Loaded ${SPECIES_DATA.length} species from species-data.ts`);
  } catch {
    console.warn('⚠ species-data.ts not found — skipping species seed');
    return [];
  }

  const rows = SPECIES_DATA.map(s => ({
    scientificName:         s.scientificName,
    commonNameEn:           s.commonNameEn ?? null,
    commonNameBg:           s.commonNameBg ?? null,
    family:                 s.family ?? null,
    nativeRegionEn:         s.nativeRegionEn ?? null,
    nativeRegionBg:         s.nativeRegionBg ?? null,
    careDifficulty:         s.careDifficulty,
    category:               getCategoryForSpecies(s.scientificName),
    descriptionEn:          s.descriptionEn ?? `${s.commonNameEn ?? s.scientificName} — a ${s.careDifficulty} care plant.`,
    descriptionBg:          s.descriptionBg ?? null,
    careGuide:              s.careGuide ?? careGuideFallback(s.careDifficulty),
    imageUrl:               s.imageUrl ?? null,
    isVerified:             true,
    wateringIntervalDays:   s.wateringIntervalDays,
    fertilizingIntervalDays: s.fertilizingIntervalDays,
    repottingIntervalMonths: s.repottingIntervalMonths,
    mistingNeeded:          s.mistingNeeded,
    isToxicToPets:          s.isToxicToPets ?? null,
  }));

  await chunkInsert(schema.plantSpecies, rows, 500);
  const inserted = await db.select({ id: schema.plantSpecies.id }).from(schema.plantSpecies);
  console.log(`   → ${inserted.length} species`);
  return inserted;
}

if (require.main === module) {
  seedSpecies()
    .then(() => process.exit(0))
    .catch(err => { console.error('❌', err.message); process.exit(1); });
}
