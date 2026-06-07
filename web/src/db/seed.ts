/**
 * Single seed command (`npm run db:seed`) — idempotent. Reuses existing reusable
 * data and only brings each table up to target:
 *   users 1,000 (+phone) · species 474 (+category, stale removed) · plants 10,000
 *   schedules 1/plant (from species intervals) · care logs 1,000 · products 5,500
 *   (+Pexels images) · orders 1,002 (rebuilt). Safe to run on the current DB or
 *   a fresh one. All seed logic lives in this one file.
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { eq, and, isNull, inArray } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import * as schema from './schema';
import { getCategoryForSpecies } from './plant-categories';
import { CATEGORY_QUERIES, fetchPexelsPhotos } from './update-product-images';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

faker.seed(7);

async function chunkInsert<T extends Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: T[],
  size = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as T[]);
  }
}

// ─── targets ────────────────────────────────────────────────────────────────
const USER_TARGET  = 1000;
const PLANT_TARGET = 10000;
const LOG_TARGET   = 1000;

const CARE_TYPES = ['watered', 'watered', 'watered', 'fertilized', 'fertilized',
                    'observation', 'observation', 'misted', 'pruned', 'rotated'] as const;

// People give plants playful nicknames — far nicer demo data than "Plant #42".
const PLANT_NICKNAMES = [
  'Greenie', 'Sprout', 'Leafy', 'Sunny', 'Spike', 'Bud', 'Planty', 'Rosie',
  'Ivy', 'Sage', 'Basil', 'Lily', 'Petal', 'Thorn', 'Bloom', 'Willow',
  'Fernie', 'Mossy', 'Sir Grows-a-lot', 'Photo Synthesis',
];

/** A believable, varied plant nickname (mix of nicknames and people names). */
function plantName(): string {
  return faker.datatype.boolean(0.5)
    ? faker.helpers.arrayElement(PLANT_NICKNAMES)
    : faker.person.firstName();
}

// ─── users ────────────────────────────────────────────────────────────────────

/** Top up users to USER_TARGET (keeps existing; bcrypt-hashed passwords). */
async function ensureUsers() {
  const existing = await db.select({ email: schema.users.email }).from(schema.users);
  const have = new Set(existing.map((u) => u.email));

  // A believable Bulgarian mobile number (+359 8x xxx xxxx).
  const bgPhone = () => `+359 8${faker.number.int({ min: 7, max: 9 })} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`;

  // Always make sure the named accounts exist (idempotent by email)
  const named: Array<{ name: string; email: string; pass: string; role: 'admin' | 'user'; phone: string }> = [
    { name: 'Admin', email: 'admin@scarlet.com', pass: 'admin123', role: 'admin', phone: '+359 88 123 4567' },
    { name: 'Demo',  email: 'demo@scarlet.com',  pass: 'demo123',  role: 'user',  phone: '+359 88 765 4321' },
    { name: 'Мария', email: 'maria@scarlet.com', pass: 'pass123',  role: 'user',  phone: '+359 89 222 3344' },
    { name: 'Иван',  email: 'ivan@scarlet.com',  pass: 'pass123',  role: 'user',  phone: '+359 87 555 6677' },
  ];
  for (const u of named) {
    if (have.has(u.email)) {
      // Backfill phone for accounts that predate the phone column.
      await db.update(schema.users)
        .set({ phone: u.phone })
        .where(and(eq(schema.users.email, u.email), isNull(schema.users.phone)));
      continue;
    }
    await db.insert(schema.users).values({
      name: u.name, email: u.email, passwordHash: await bcrypt.hash(u.pass, 10),
      role: u.role, preferredLocale: 'bg', phone: u.phone,
    });
    have.add(u.email);
  }

  const total = have.size;
  const need = USER_TARGET - total;
  if (need <= 0) { console.log(`👤 users already ${total} (≥ ${USER_TARGET})`); return; }

  const hash = await bcrypt.hash('user1234', 10); // hash once, reuse for bulk
  const rows: Array<typeof schema.users.$inferInsert> = [];
  let n = 0;
  while (rows.length < need) {
    const email = `topup${n++}@scarlet.app`;
    if (have.has(email)) continue;
    have.add(email);
    rows.push({ name: faker.person.fullName(), email, passwordHash: hash, role: 'user', preferredLocale: 'bg', phone: bgPhone() });
  }
  await chunkInsert(schema.users, rows, 500);
  console.log(`👤 +${rows.length} users → ${USER_TARGET}`);
}

// ─── species ────────────────────────────────────────────────────────────────

/** Default {en,bg} care guide by difficulty when a species has none of its own. */
function careGuideFallback(d: 'easy' | 'moderate' | 'difficult') {
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

/**
 * Reconcile species to exactly the species-data set:
 *  1. insert any missing species (with category),
 *  2. re-point plants off "stale" species (not in species-data) onto a valid,
 *     photo-bearing species,
 *  3. delete the stale species.
 */
async function reconcileSpecies() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SPECIES_DATA } = require('./species-data') as { SPECIES_DATA: Array<Record<string, unknown>> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataNames = new Set(SPECIES_DATA.map((s: any) => s.scientificName));

  // 1. insert missing
  const before = await db.select({ name: schema.plantSpecies.scientificName }).from(schema.plantSpecies);
  const haveNames = new Set(before.map((s) => s.name));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const missing = SPECIES_DATA.filter((s: any) => !haveNames.has(s.scientificName));
  if (missing.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = missing.map((s: any) => ({
      scientificName:          s.scientificName,
      commonNameEn:            s.commonNameEn ?? null,
      commonNameBg:            s.commonNameBg ?? null,
      family:                  s.family ?? null,
      nativeRegionEn:          s.nativeRegionEn ?? null,
      nativeRegionBg:          s.nativeRegionBg ?? null,
      careDifficulty:          s.careDifficulty,
      category:                getCategoryForSpecies(s.scientificName),
      descriptionEn:           s.descriptionEn ?? `${s.commonNameEn ?? s.scientificName} — a ${s.careDifficulty} care plant.`,
      descriptionBg:           s.descriptionBg ?? null,
      careGuide:               s.careGuide ?? careGuideFallback(s.careDifficulty),
      imageUrl:                s.imageUrl ?? null,
      isVerified:              true,
      wateringIntervalDays:    s.wateringIntervalDays,
      fertilizingIntervalDays: s.fertilizingIntervalDays,
      repottingIntervalMonths: s.repottingIntervalMonths,
      mistingNeeded:           s.mistingNeeded,
      isToxicToPets:           s.isToxicToPets ?? null,
    }));
    await chunkInsert(schema.plantSpecies, rows, 500);
  }

  // 2 + 3. repoint plants off stale species, then delete stale
  const all = await db
    .select({ id: schema.plantSpecies.id, name: schema.plantSpecies.scientificName, imageUrl: schema.plantSpecies.imageUrl })
    .from(schema.plantSpecies);
  const valid = all.filter((s) => dataNames.has(s.name));
  const stale = all.filter((s) => !dataNames.has(s.name));
  const validWithImg = valid.filter((s) => !!s.imageUrl);

  if (stale.length) {
    const pool = validWithImg.length ? validWithImg : valid;
    for (let i = 0; i < stale.length; i++) {
      const v = pool[i % pool.length];
      await db.update(schema.plants)
        .set({ speciesId: v.id, imageUrl: v.imageUrl })
        .where(eq(schema.plants.speciesId, stale[i].id));
    }
    await db.delete(schema.plantSpecies).where(inArray(schema.plantSpecies.id, stale.map((s) => s.id)));
  }
  console.log(`🌿 species: +${missing.length} inserted, ${stale.length} stale removed → ${valid.length}`);
}

// ─── plants ───────────────────────────────────────────────────────────────────

/** Top up plants to PLANT_TARGET, each reusing its species' photo. */
async function ensurePlants() {
  const existingCount = (await db.select({ id: schema.plants.id }).from(schema.plants)).length;
  const need = PLANT_TARGET - existingCount;
  if (need <= 0) { console.log(`🪴 plants already ${existingCount} (≥ ${PLANT_TARGET})`); return; }

  const users   = await db.select({ id: schema.users.id }).from(schema.users);
  const owners  = users.slice(0, 3).map((u) => u.id);
  const species = await db
    .select({ id: schema.plantSpecies.id, imageUrl: schema.plantSpecies.imageUrl })
    .from(schema.plantSpecies);
  const speciesIds = species.map((s) => s.id);
  const imgMap = new Map(species.map((s) => [s.id, s.imageUrl]));

  const rows = Array.from({ length: need }, (_, i) => {
    const speciesId = speciesIds[i % speciesIds.length];
    return {
      userId:           owners[i % owners.length],
      speciesId,
      customName:       plantName(),
      healthScore:      parseFloat(faker.number.float({ min: 40, max: 100, fractionDigits: 1 }).toFixed(1)),
      lastWatered:      faker.date.recent({ days: 30 }),
      imageUrl:         imgMap.get(speciesId) ?? null,
      isArchived:       false,
      isPublic:         true,
      speciesConfirmed: true,
    };
  });
  await chunkInsert(schema.plants, rows, 500);
  console.log(`🪴 +${rows.length} plants → ${PLANT_TARGET}`);
}

/**
 * Give every plant lacking a schedule exactly one, derived from its species'
 * care intervals (same logic the app uses in createScheduleFromSpecies), so
 * seeded demo data is consistent with the catalog and the scan→schedule flow.
 */
async function ensureSchedules() {
  const orphans = await db
    .select({
      id:                      schema.plants.id,
      lastWatered:             schema.plants.lastWatered,
      wateringIntervalDays:    schema.plantSpecies.wateringIntervalDays,
      fertilizingIntervalDays: schema.plantSpecies.fertilizingIntervalDays,
      repottingIntervalMonths: schema.plantSpecies.repottingIntervalMonths,
      mistingNeeded:           schema.plantSpecies.mistingNeeded,
    })
    .from(schema.plants)
    .leftJoin(schema.plantSpecies, eq(schema.plantSpecies.id, schema.plants.speciesId))
    .leftJoin(schema.plantCareSchedules, eq(schema.plantCareSchedules.plantId, schema.plants.id))
    .where(isNull(schema.plantCareSchedules.id));
  if (!orphans.length) { console.log('📅 schedules already complete'); return; }

  const DAY = 86_400_000;
  const rows = orphans.map((p) => {
    const lastWatered = p.lastWatered ?? new Date();
    const wDays  = p.wateringIntervalDays    ?? 7;
    const fDays  = p.fertilizingIntervalDays ?? 14;
    const rMonth = p.repottingIntervalMonths ?? 18;
    const mist   = p.mistingNeeded ?? false;
    return {
      plantId:                 p.id,
      wateringIntervalDays:    wDays,
      wateringNextDue:         new Date(lastWatered.getTime() + wDays * DAY),
      fertilizingIntervalDays: fDays,
      fertilizingNextDue:      new Date(lastWatered.getTime() + fDays * DAY),
      repottingIntervalMonths: rMonth,
      repottingNextDue:        new Date(lastWatered.getTime() + rMonth * 30 * DAY),
      mistingNeeded:           mist,
      mistingNextDue:          mist ? new Date(lastWatered.getTime() + 2 * DAY) : null,
      isCustomized:            false,
    };
  });
  await chunkInsert(schema.plantCareSchedules, rows, 500);
  console.log(`📅 +${rows.length} care schedules`);
}

/** Top up care logs to LOG_TARGET across random plants. */
async function ensureCareLogs(notesPool: string[] = []) {
  const have = (await db.select({ id: schema.plantCareLogs.id }).from(schema.plantCareLogs)).length;
  const need = LOG_TARGET - have;
  if (need <= 0) { console.log(`📋 care logs already ${have} (≥ ${LOG_TARGET})`); return; }

  const plants = await db.select({ id: schema.plants.id, userId: schema.plants.userId }).from(schema.plants);
  if (!plants.length) { console.log('📋 no plants — skipping care logs'); return; }

  const rows = Array.from({ length: need }, () => {
    const plant = faker.helpers.arrayElement(plants);
    return {
      plantId:  plant.id,
      userId:   plant.userId,
      careType: CARE_TYPES[faker.number.int({ min: 0, max: CARE_TYPES.length - 1 })],
      photoUrl: null as string | null,
      notes:    notesPool.length > 0
        ? faker.helpers.maybe(() => faker.helpers.arrayElement(notesPool), { probability: 0.6 }) ?? null
        : null,
      loggedAt: faker.date.recent({ days: 180 }),
    };
  });
  await chunkInsert(schema.plantCareLogs, rows, 500);
  console.log(`📋 +${rows.length} care logs → ${LOG_TARGET}`);
}

// ─── products ─────────────────────────────────────────────────────────────────

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
async function seedProducts() {
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
async function assignProductImages() {
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

// ─── orders ───────────────────────────────────────────────────────────────────

/** Rebuild orders fresh against current products + users (pickup-only: no address). */
async function seedOrders(
  allUserIds: string[],
  allProductIds: Array<{ id: string; price: string }>,
) {
  const ORDER_COUNT = 1002;
  const statuses    = schema.orderStatusEnum.enumValues;

  console.log(`🛒 Seeding ${ORDER_COUNT} orders...`);

  for (let batch = 0; batch < ORDER_COUNT; batch += 200) {
    const size = Math.min(200, ORDER_COUNT - batch);

    const orderData = Array.from({ length: size }, () => {
      const userId = faker.helpers.arrayElement(allUserIds);
      const items  = faker.number.int({ min: 1, max: 3 });
      let total    = 0;
      const lineItems = Array.from({ length: items }, () => {
        const product = faker.helpers.arrayElement(allProductIds);
        const qty     = faker.number.int({ min: 1, max: 3 });
        const price   = parseFloat(product.price as string);
        total        += price * qty;
        return { productId: product.id, qty, price };
      });
      return { userId, total: parseFloat(total.toFixed(2)), lineItems };
    });

    const inserted = await db.insert(schema.orders).values(
      orderData.map(o => ({
        userId:          o.userId,
        total:           o.total.toFixed(2),
        status:          faker.helpers.arrayElement(statuses),
        shippingAddress: null,
      }))
    ).returning();

    const itemRows = inserted.flatMap((order, i) =>
      orderData[i].lineItems.map(li => ({
        orderId:   order.id,
        productId: li.productId,
        quantity:  li.qty,
        unitPrice: li.price.toFixed(2),
      }))
    );
    await chunkInsert(schema.orderItems, itemRows, 500);
  }

  console.log(`   → ${ORDER_COUNT} orders`);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Scarlet seed — idempotent (reuses existing data, no full wipe)\n');

  // Optional realistic care-note pool; ignored if not generated.
  // (Orders intentionally carry no shipping address — pickup-only shop.)
  let careNotes: string[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { REALISTIC_DATA } = require('./realistic-data');
    careNotes = REALISTIC_DATA.careNotes ?? [];
  } catch { /* fine — falls back to built-in defaults */ }

  await ensureUsers();
  await reconcileSpecies();
  await ensurePlants();
  await ensureSchedules();
  await ensureCareLogs(careNotes);

  // Products: idempotent insert from products-data.ts + fill missing images
  const products = await seedProducts();

  // Orders: reproduced fresh against current products + users
  console.log('🛒 Rebuilding orders...');
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  const userIds = (await db.select({ id: schema.users.id }).from(schema.users)).map((u) => u.id);
  faker.seed(42);
  await seedOrders(userIds, products);

  console.log('\n✅ Seed complete.');
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  process.exit(1);
});
