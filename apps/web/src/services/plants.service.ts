import { eq, and, desc, lt, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plants, plantSpecies, plantStats, aiAnalyses } from '@/lib/db/schema';
import { plantSchema, plantStatSchema, MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '@scarlet/shared';
import { uploadToR2 } from '@/lib/r2/client';
import { randomUUID } from 'crypto';
import { ServiceError } from './service-error';

export async function listPlants(userId: string, limit: number, cursor?: string) {
  const conditions = [eq(plants.userId, userId), eq(plants.isArchived, false)];
  if (cursor) conditions.push(lt(plants.createdAt, new Date(cursor)));

  const items = await db
    .select({
      id: plants.id,
      userId: plants.userId,
      speciesId: plants.speciesId,
      customName: plants.customName,
      healthScore: plants.healthScore,
      lastWatered: plants.lastWatered,
      imageUrl: plants.imageUrl,
      isArchived: plants.isArchived,
      speciesConfirmed: plants.speciesConfirmed,
      createdAt: plants.createdAt,
      updatedAt: plants.updatedAt,
      species: {
        id: plantSpecies.id,
        commonNameBg: plantSpecies.commonNameBg,
        commonNameEn: plantSpecies.commonNameEn,
        scientificName: plantSpecies.scientificName,
        careDifficulty: plantSpecies.careDifficulty,
        imageUrl: plantSpecies.imageUrl,
      },
    })
    .from(plants)
    .leftJoin(plantSpecies, eq(plants.speciesId, plantSpecies.id))
    .where(and(...conditions))
    .orderBy(desc(plants.createdAt))
    .limit(limit + 1);

  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? result[result.length - 1].createdAt.toISOString() : null;

  return { plants: result, nextCursor, hasMore };
}

export async function getPlant(id: string, userId: string, role: string) {
  const [row] = await db
    .select()
    .from(plants)
    .leftJoin(plantSpecies, eq(plants.speciesId, plantSpecies.id))
    .where(eq(plants.id, id))
    .limit(1);

  if (!row) throw new ServiceError('Plant not found', 404);
  if (row.plants.userId !== userId && role !== 'admin') throw new ServiceError('Forbidden', 403);

  return { ...row.plants, species: row.plant_species };
}

export async function createPlant(userId: string, data: unknown) {
  const parsed = plantSchema.safeParse(data);
  if (!parsed.success) throw new ServiceError(parsed.error.errors[0].message, 400);

  const [plant] = await db
    .insert(plants)
    .values({
      userId,
      customName: parsed.data.customName,
      speciesId: parsed.data.speciesId ?? null,
      lastWatered: parsed.data.lastWatered ? new Date(parsed.data.lastWatered) : null,
    })
    .returning();

  return plant;
}

export async function updatePlant(id: string, userId: string, role: string, data: unknown) {
  const [existing] = await db
    .select({ userId: plants.userId })
    .from(plants)
    .where(eq(plants.id, id))
    .limit(1);

  if (!existing) throw new ServiceError('Plant not found', 404);
  if (existing.userId !== userId && role !== 'admin') throw new ServiceError('Forbidden', 403);

  const parsed = plantSchema.partial().safeParse(data);
  if (!parsed.success) throw new ServiceError(parsed.error.errors[0].message, 400);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.customName !== undefined) updates.customName = parsed.data.customName;
  if (parsed.data.speciesId !== undefined) updates.speciesId = parsed.data.speciesId;
  if (parsed.data.lastWatered !== undefined) {
    updates.lastWatered = parsed.data.lastWatered ? new Date(parsed.data.lastWatered) : null;
  }
  if (parsed.data.speciesConfirmed !== undefined) updates.speciesConfirmed = parsed.data.speciesConfirmed;

  const [updated] = await db.update(plants).set(updates).where(eq(plants.id, id)).returning();
  return updated;
}

export async function archivePlant(id: string, userId: string, role: string) {
  const [existing] = await db
    .select({ userId: plants.userId })
    .from(plants)
    .where(and(eq(plants.id, id), eq(plants.userId, userId)))
    .limit(1);

  if (!existing && role !== 'admin') throw new ServiceError('Plant not found', 404);

  await db.update(plants).set({ isArchived: true, updatedAt: new Date() }).where(eq(plants.id, id));
}

export async function uploadPlantImage(id: string, userId: string, file: File) {
  const [plant] = await db.select({ userId: plants.userId }).from(plants).where(eq(plants.id, id)).limit(1);
  if (!plant) throw new ServiceError('Plant not found', 404);
  if (plant.userId !== userId) throw new ServiceError('Forbidden', 403);

  if (file.size > MAX_FILE_SIZE_BYTES) throw new ServiceError('File too large (max 5MB)', 400);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ServiceError('Invalid file type. Use JPEG, PNG, or WebP', 400);
  }

  const ext = file.type.split('/')[1];
  const key = `plants/${userId}/${id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(key, buffer, file.type);

  await db.update(plants).set({ imageUrl: url, updatedAt: new Date() }).where(eq(plants.id, id));
  return { url };
}

export async function getAnalyses(plantId: string, userId: string, limit: number, offset: number) {
  const [plant] = await db
    .select({ id: plants.id, userId: plants.userId })
    .from(plants)
    .where(and(eq(plants.id, plantId), eq(plants.userId, userId)))
    .limit(1);

  if (!plant) throw new ServiceError('Not found', 404);

  const analyses = await db
    .select()
    .from(aiAnalyses)
    .where(eq(aiAnalyses.plantId, plantId))
    .orderBy(desc(aiAnalyses.analyzedAt))
    .limit(limit)
    .offset(offset);

  return { analyses };
}

export async function getPlantStats(
  plantId: string,
  userId: string,
  role: string,
  query: { limit: number; offset: number; metric?: string; from?: Date; to?: Date }
) {
  const [plant] = await db.select({ userId: plants.userId }).from(plants).where(eq(plants.id, plantId)).limit(1);
  if (!plant) throw new ServiceError('Plant not found', 404);
  if (plant.userId !== userId && role !== 'admin') throw new ServiceError('Forbidden', 403);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(plantStats.plantId, plantId)];
  if (query.metric) conditions.push(eq(plantStats.metricType, query.metric as 'water'));
  if (query.from) conditions.push(gte(plantStats.recordedAt, query.from));
  if (query.to) conditions.push(lte(plantStats.recordedAt, query.to));

  const items = await db
    .select()
    .from(plantStats)
    .where(and(...conditions))
    .orderBy(desc(plantStats.recordedAt))
    .limit(query.limit)
    .offset(query.offset);

  return { stats: items, limit: query.limit, offset: query.offset };
}

export async function createPlantStat(plantId: string, userId: string, data: unknown) {
  const [plant] = await db.select({ userId: plants.userId }).from(plants).where(eq(plants.id, plantId)).limit(1);
  if (!plant) throw new ServiceError('Plant not found', 404);
  if (plant.userId !== userId) throw new ServiceError('Forbidden', 403);

  const parsed = plantStatSchema.safeParse(data);
  if (!parsed.success) throw new ServiceError(parsed.error.errors[0].message, 400);

  const [stat] = await db
    .insert(plantStats)
    .values({
      plantId,
      metricType: parsed.data.metricType,
      value: parsed.data.value,
      unit: parsed.data.unit ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return stat;
}
