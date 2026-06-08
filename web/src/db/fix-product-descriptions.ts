/**
 * Replaces template-generated product descriptions with proper ones.
 * Currently targets the `accessories` category (200 products).
 *
 * Run (preview): npm run db:fix-product-descriptions -- --preview
 * Run (apply):   npm run db:fix-product-descriptions
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const { products } = schema;

const PREVIEW = process.argv.includes('--preview');

// ── Descriptions keyed by EN keyword found in the product nameEn ─────────────

const ACCESSORY_DESCRIPTIONS: Array<{
  match: string;
  en: string;
  bg: string;
}> = [
  {
    match: 'Plant Pot',
    en: 'Durable ceramic plant pot with drainage hole — keeps roots healthy and soil aerated.',
    bg: 'Издръжлива керамична саксия с дренажен отвор — пази корените здрави и почвата проветрена.',
  },
  {
    match: 'Soil Mix',
    en: 'Premium potting soil with perlite for excellent drainage and nutrient retention. Ready to use straight from the bag.',
    bg: 'Висококачествена почвена смес с перлит за отличен дренаж и задържане на хранителни вещества. Готова за директна употреба.',
  },
  {
    match: 'Liquid Fertilizer',
    en: 'Balanced liquid fertilizer to encourage lush growth and vibrant blooms. Dilute in water before applying.',
    bg: 'Балансиран течен тор за буен растеж и ярко цъфтене. Разредете с вода преди употреба.',
  },
  {
    match: 'Watering Can',
    en: 'Ergonomic watering can with a slender spout for precise, root-level watering — ideal for indoor plants.',
    bg: 'Ергономична лейка с тесен накрайник за прецизно поливане на нивото на корените — идеална за стайни растения.',
  },
  {
    match: 'Plant Label',
    en: 'Waterproof plant labels for keeping track of your collection. Easy to write on and wipe clean for reuse.',
    bg: 'Водоустойчиви етикети за идентифициране на растенията ви. Лесни за надписване и повторна употреба.',
  },
  {
    match: 'Pebble Tray',
    en: 'Decorative pebble tray placed under your pot to boost humidity and catch excess drainage water.',
    bg: 'Декоративна тавичка с камъчета под саксията за повишаване на влажността и задържане на излишната вода.',
  },
  {
    match: 'Spray Bottle',
    en: 'Fine-mist spray bottle for misting humidity-loving plants and gently cleaning dusty leaves.',
    bg: 'Пулверизатор с фина мъгла за напрашване на влаголюбиви растения и нежно почистване на листата.',
  },
  {
    match: 'Pruning Shears',
    en: 'Sharp stainless-steel pruning shears for clean, precise cuts that help your plants heal faster.',
    bg: 'Остри ножици от неръждаема стомана за чисти и прецизни срезове, ускоряващи зарастването.',
  },
  {
    match: 'Hanging Planter',
    en: 'Stylish hanging planter that brings vertical greenery to any room. Suitable for trailing plants.',
    bg: 'Стилна висяща кашпа за вертикално озеленяване. Подходяща за висящи растения.',
  },
  {
    match: 'Pot Saucer',
    en: 'Matching ceramic saucer to protect your surfaces from drainage water while keeping your setup tidy.',
    bg: 'Подходяща керамична чиния за защита на повърхностите от дренажна вода — поддържа реда.',
  },
];

function descriptionFor(nameEn: string): { en: string; bg: string } | null {
  for (const entry of ACCESSORY_DESCRIPTIONS) {
    if (nameEn.includes(entry.match)) return { en: entry.en, bg: entry.bg };
  }
  return null;
}

async function main() {
  const rows = await db
    .select({ id: products.id, nameEn: products.nameEn, descriptionEn: products.descriptionEn })
    .from(products)
    .where(eq(products.category, 'accessories'));

  console.log(`\n🛠  Fix product descriptions — ${rows.length} accessories${PREVIEW ? ' (PREVIEW)' : ''}\n`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const desc = descriptionFor(row.nameEn);
    if (!desc) {
      console.log(`  ⚠  No template for: "${row.nameEn}"`);
      skipped++;
      continue;
    }

    if (PREVIEW) {
      console.log(`  → ${row.nameEn}`);
      console.log(`     EN: ${desc.en}`);
      console.log(`     BG: ${desc.bg}\n`);
    } else {
      await db
        .update(products)
        .set({ descriptionEn: desc.en, descriptionBg: desc.bg })
        .where(eq(products.id, row.id));
    }
    updated++;
  }

  if (PREVIEW) {
    console.log(`Would update ${updated} products, ${skipped} without a template.\n`);
    console.log('Run without --preview to apply.\n');
  } else {
    console.log(`\n✅ Updated ${updated} products.${skipped > 0 ? ` ⚠  ${skipped} skipped (no template).` : ''}\n`);
  }
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
