import { db, chunkInsert } from './seed-utils';
import * as schema from './schema';
import { faker } from '@faker-js/faker';

faker.seed(42);

export async function seedPlants(
  allUserIds: string[],
  allSpeciesIds: string[],
  careNotesPool: string[],
) {
  const PLANT_COUNT = 10000;
  // Distribute across first 3 users
  const owners = allUserIds.slice(0, 3);

  // Map species → photo so each plant reuses its species' image (≈90% have one)
  const speciesRows = await db
    .select({ id: schema.plantSpecies.id, imageUrl: schema.plantSpecies.imageUrl })
    .from(schema.plantSpecies);
  const speciesImageMap = new Map(speciesRows.map((s) => [s.id, s.imageUrl]));

  console.log(`🪴 Seeding ${PLANT_COUNT} plants across ${owners.length} users...`);

  const plantRows = Array.from({ length: PLANT_COUNT }, (_, i) => {
    const userId    = owners[i % owners.length];
    const speciesId = allSpeciesIds[i % allSpeciesIds.length];
    return {
      userId,
      speciesId,
      customName:       `Plant #${i + 1}`,
      healthScore:      parseFloat(faker.number.float({ min: 40, max: 100, fractionDigits: 1 }).toFixed(1)),
      lastWatered:      faker.date.recent({ days: 30 }),
      imageUrl:         speciesImageMap.get(speciesId) ?? null,
      isArchived:       i > PLANT_COUNT - 50,
      isPublic:         i <= PLANT_COUNT - 50,
      speciesConfirmed: i < PLANT_COUNT - 1000,
    };
  });

  await chunkInsert(schema.plants, plantRows, 500);
  const insertedPlants = await db.select({ id: schema.plants.id }).from(schema.plants);
  console.log(`   → ${insertedPlants.length} plants`);

  // Care schedules — 1 per plant
  console.log('📅 Seeding care schedules...');
  const scheduleRows = insertedPlants.map((plant, i) => {
    const lastWatered = plantRows[i % plantRows.length].lastWatered as Date;
    const wDays  = faker.number.int({ min: 5, max: 21 });
    const fDays  = faker.number.int({ min: 14, max: 60 });
    const rMonth = faker.number.int({ min: 12, max: 36 });
    const mist   = faker.datatype.boolean(0.3);
    return {
      plantId:                 plant.id,
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
  await chunkInsert(schema.plantCareSchedules, scheduleRows, 500);
  console.log(`   → ${scheduleRows.length} schedules`);

  // Care logs — a flat 1,000 across random plants (from realistic note pool)
  const LOG_COUNT = 1000;
  console.log(`📋 Seeding ${LOG_COUNT} care logs...`);
  const careWeights = ['watered', 'watered', 'watered', 'fertilized', 'fertilized',
                       'observation', 'observation', 'misted', 'pruned', 'rotated'] as const;
  const logRows = Array.from({ length: LOG_COUNT }, () => {
    const plant  = faker.helpers.arrayElement(insertedPlants);
    const userId = owners[faker.number.int({ min: 0, max: owners.length - 1 })];
    return {
      plantId:  plant.id,
      userId,
      careType: careWeights[faker.number.int({ min: 0, max: careWeights.length - 1 })],
      photoUrl: null as string | null,
      notes:    careNotesPool.length > 0
        ? faker.helpers.maybe(() => faker.helpers.arrayElement(careNotesPool), { probability: 0.6 }) ?? null
        : null,
      loggedAt: faker.date.recent({ days: 180 }),
    };
  });
  await chunkInsert(schema.plantCareLogs, logRows, 500);
  console.log(`   → ${logRows.length} care logs`);

  return insertedPlants;
}

if (require.main === module) {
  (async () => {
    const users   = await db.select({ id: schema.users.id }).from(schema.users);
    const species = await db.select({ id: schema.plantSpecies.id }).from(schema.plantSpecies);
    if (!users.length || !species.length) {
      console.error('❌ Run seed-users and seed-species first');
      process.exit(1);
    }
    await seedPlants(users.map(u => u.id), species.map(s => s.id), []);
    process.exit(0);
  })().catch(err => { console.error('❌', err.message); process.exit(1); });
}
