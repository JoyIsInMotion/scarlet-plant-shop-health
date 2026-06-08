import { eq, and, desc, lt, count, or, ilike } from 'drizzle-orm';
import { db } from '@/db';
import { plants, plantSpecies, aiAnalyses, plantPhotos } from '@/db/schema';
import { plantSchema, MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '@scarlet/shared';
import { uploadToR2 } from '@/lib/r2/client';
import { randomUUID } from 'crypto';
import { ServiceError } from './service-error';
import { createScheduleFromSpecies } from './care.service';

const plantSelectShape = {
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
};

export async function listPlants(
  userId: string,
  limit: number,
  options: { cursor?: string; offset?: number; search?: string; difficulty?: string } = {},
) {
  const conditions = [eq(plants.userId, userId), eq(plants.isArchived, false)];

  if (options.search) {
    const q = `%${options.search}%`;
    const clause = or(
      ilike(plants.customName, q),
      ilike(plantSpecies.commonNameEn, q),
      ilike(plantSpecies.commonNameBg, q),
      ilike(plantSpecies.scientificName, q),
    );
    if (clause) conditions.push(clause);
  }

  if (options.difficulty && ['easy', 'moderate', 'difficult'].includes(options.difficulty)) {
    conditions.push(eq(plantSpecies.careDifficulty, options.difficulty as 'easy' | 'moderate' | 'difficult'));
  }

  const hasSpeciesFilter = !!(options.search || options.difficulty);

  if (options.offset !== undefined) {
    const baseQuery = db
      .select(plantSelectShape)
      .from(plants)
      .leftJoin(plantSpecies, eq(plants.speciesId, plantSpecies.id))
      .where(and(...conditions));

    const countQuery = hasSpeciesFilter
      ? db.select({ total: count() }).from(plants)
          .leftJoin(plantSpecies, eq(plants.speciesId, plantSpecies.id))
          .where(and(...conditions))
      : db.select({ total: count() }).from(plants)
          .where(and(...conditions));

    const [items, [{ total }]] = await Promise.all([
      baseQuery.orderBy(desc(plants.createdAt)).limit(limit).offset(options.offset),
      countQuery,
    ]);
    return { plants: items, total, hasMore: options.offset + limit < total, nextCursor: null };
  }

  if (options.cursor) conditions.push(lt(plants.createdAt, new Date(options.cursor)));

  const items = await db
    .select(plantSelectShape)
    .from(plants)
    .leftJoin(plantSpecies, eq(plants.speciesId, plantSpecies.id))
    .where(and(...conditions))
    .orderBy(desc(plants.createdAt))
    .limit(limit + 1);

  const hasMore = items.length > limit;
  const result = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? result[result.length - 1].createdAt.toISOString() : null;

  return { plants: result, total: null, nextCursor, hasMore };
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

  // Auto-generate care schedule when a species is known
  if (plant.speciesId) {
    await createScheduleFromSpecies(plant.id, plant.speciesId);
  }

  return plant;
}

export async function updatePlant(id: string, userId: string, role: string, data: unknown) {
  const [existing] = await db
    .select({ userId: plants.userId, speciesId: plants.speciesId })
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

  // Newly linking (or relinking) a species refreshes the care schedule from
  // that species' defaults — unless the user already customized their schedule.
  if (parsed.data.speciesId && parsed.data.speciesId !== existing.speciesId) {
    await createScheduleFromSpecies(updated.id, parsed.data.speciesId);
  }

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

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(aiAnalyses)
      .leftJoin(plantSpecies, eq(aiAnalyses.matchedSpeciesId, plantSpecies.id))
      .where(eq(aiAnalyses.plantId, plantId))
      .orderBy(desc(aiAnalyses.analyzedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(aiAnalyses).where(eq(aiAnalyses.plantId, plantId)),
  ]);

  const analyses = rows.map((r) => ({ ...r.ai_analyses, matchedSpecies: r.plant_species ?? null }));
  return { analyses, total: Number(total) };
}

// ── Plant photos ──────────────────────────────────────────────────────────────

export async function listPlantPhotos(id: string, userId: string) {
  const [plant] = await db
    .select({ userId: plants.userId })
    .from(plants)
    .where(eq(plants.id, id))
    .limit(1);

  if (!plant) throw new ServiceError('Plant not found', 404);
  if (plant.userId !== userId) throw new ServiceError('Forbidden', 403);

  const photos = await db
    .select()
    .from(plantPhotos)
    .where(eq(plantPhotos.plantId, id))
    .orderBy(desc(plantPhotos.uploadedAt));

  return photos;
}

export async function addPlantPhoto(id: string, userId: string, imageUrl: string) {
  const [plant] = await db
    .select({ userId: plants.userId })
    .from(plants)
    .where(eq(plants.id, id))
    .limit(1);

  if (!plant) throw new ServiceError('Plant not found', 404);
  if (plant.userId !== userId) throw new ServiceError('Forbidden', 403);

  const [photo] = await db
    .insert(plantPhotos)
    .values({
      plantId: id,
      userId,
      imageUrl,
      uploadedAt: new Date(),
    })
    .returning();

  return photo;
}

export async function deletePlantPhoto(photoId: string, userId: string) {
  const [photo] = await db
    .select({ userId: plantPhotos.userId })
    .from(plantPhotos)
    .where(eq(plantPhotos.id, photoId))
    .limit(1);

  if (!photo) throw new ServiceError('Photo not found', 404);
  if (photo.userId !== userId) throw new ServiceError('Forbidden', 403);

  await db.delete(plantPhotos).where(eq(plantPhotos.id, photoId));
}

export async function deletePlant(id: string, userId: string, role: string) {
  const [existing] = await db
    .select({ userId: plants.userId })
    .from(plants)
    .where(eq(plants.id, id))
    .limit(1);

  if (!existing && role !== 'admin') throw new ServiceError('Plant not found', 404);
  if (existing.userId !== userId && role !== 'admin') throw new ServiceError('Forbidden', 403);

  await db.delete(plants).where(eq(plants.id, id));
}

