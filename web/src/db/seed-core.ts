/**
 * Idempotent seed building blocks used by seed.ts. Each function brings one
 * concern up to target WITHOUT wiping reusable data; safe to re-run.
 */
import { eq, and, isNull, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { db, chunkInsert } from './seed-utils';
import * as schema from './schema';
import { careGuideFallback } from './seed-species';
import { getCategoryForSpecies } from './plant-categories';

faker.seed(7);

export const USER_TARGET  = 1000;
export const PLANT_TARGET = 10000;
export const LOG_TARGET   = 1000;

const CARE_TYPES = ['watered', 'watered', 'watered', 'fertilized', 'fertilized',
                    'observation', 'observation', 'misted', 'pruned', 'rotated'] as const;

/** Top up users to USER_TARGET (keeps existing; bcrypt-hashed passwords). */
export async function ensureUsers() {
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

/**
 * Reconcile species to exactly the species-data set:
 *  1. insert any missing species (with category),
 *  2. re-point plants off "stale" species (not in species-data) onto a valid,
 *     photo-bearing species,
 *  3. delete the stale species.
 */
export async function reconcileSpecies() {
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

/** Top up plants to PLANT_TARGET, each reusing its species' photo. */
export async function ensurePlants() {
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
      customName:       `Plant #${existingCount + i + 1}`,
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

/** Give every plant lacking a schedule exactly one. */
export async function ensureSchedules() {
  const orphans = await db
    .select({ id: schema.plants.id, lastWatered: schema.plants.lastWatered })
    .from(schema.plants)
    .leftJoin(schema.plantCareSchedules, eq(schema.plantCareSchedules.plantId, schema.plants.id))
    .where(isNull(schema.plantCareSchedules.id));
  if (!orphans.length) { console.log('📅 schedules already complete'); return; }

  const rows = orphans.map((p) => {
    const lastWatered = p.lastWatered ?? new Date();
    const wDays  = faker.number.int({ min: 5, max: 21 });
    const fDays  = faker.number.int({ min: 14, max: 60 });
    const rMonth = faker.number.int({ min: 12, max: 36 });
    const mist   = faker.datatype.boolean(0.3);
    return {
      plantId:                 p.id,
      wateringIntervalDays:    wDays,
      wateringNextDue:         new Date(lastWatered.getTime() + wDays * 86_400_000),
      fertilizingIntervalDays: fDays,
      fertilizingNextDue:      faker.date.soon({ days: fDays }),
      repottingIntervalMonths: rMonth,
      repottingNextDue:        faker.date.future({ years: rMonth / 12 }),
      mistingNeeded:           mist,
      mistingNextDue:          mist ? faker.date.soon({ days: 2 }) : null,
      isCustomized:            false,
    };
  });
  await chunkInsert(schema.plantCareSchedules, rows, 500);
  console.log(`📅 +${rows.length} care schedules`);
}

/** Top up care logs to LOG_TARGET across random plants. */
export async function ensureCareLogs(notesPool: string[] = []) {
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
