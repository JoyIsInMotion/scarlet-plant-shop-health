import { eq, ilike, or, and, count, desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plants, plantSpecies, plantLikes, users } from '@/lib/db/schema';
import { ServiceError } from './service-error';

export async function listCommunityPlants(query: {
  limit: number;
  offset: number;
  search?: string;
  difficulty?: string;
  currentUserId?: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [
    eq(plants.isPublic, true),
    eq(plants.isArchived, false),
  ];

  if (query.search) {
    conditions.push(
      or(
        ilike(plants.customName, `%${query.search}%`),
        ilike(plantSpecies.commonNameEn, `%${query.search}%`),
        ilike(plantSpecies.commonNameBg, `%${query.search}%`),
        ilike(plantSpecies.scientificName, `%${query.search}%`)
      )
    );
  }

  if (query.difficulty) {
    conditions.push(eq(plantSpecies.careDifficulty, query.difficulty as 'easy'));
  }

  const where = and(...conditions);

  const [items, [{ value: total }]] = await Promise.all([
    db
      .select({
        id: plants.id,
        customName: plants.customName,
        imageUrl: plants.imageUrl,
        healthScore: plants.healthScore,
        likesCount: plants.likesCount,
        createdAt: plants.createdAt,
        ownerName: users.name,
        ownerId: users.id,
        speciesId: plantSpecies.id,
        commonNameEn: plantSpecies.commonNameEn,
        commonNameBg: plantSpecies.commonNameBg,
        scientificName: plantSpecies.scientificName,
        speciesImageUrl: plantSpecies.imageUrl,
        careDifficulty: plantSpecies.careDifficulty,
        isLiked: query.currentUserId
          ? sql<boolean>`EXISTS (
              SELECT 1 FROM plant_likes
              WHERE plant_likes.plant_id = ${plants.id}
                AND plant_likes.user_id = ${query.currentUserId}
            )`
          : sql<boolean>`false`,
      })
      .from(plants)
      .innerJoin(users, eq(plants.userId, users.id))
      .leftJoin(plantSpecies, eq(plants.speciesId, plantSpecies.id))
      .where(where)
      .orderBy(desc(plants.likesCount), desc(plants.createdAt))
      .limit(query.limit)
      .offset(query.offset),

    db
      .select({ value: count() })
      .from(plants)
      .innerJoin(users, eq(plants.userId, users.id))
      .leftJoin(plantSpecies, eq(plants.speciesId, plantSpecies.id))
      .where(where),
  ]);

  return {
    plants: items,
    total: Number(total),
    limit: query.limit,
    offset: query.offset,
  };
}

export async function togglePlantLike(plantId: string, userId: string) {
  const [plant] = await db
    .select({ id: plants.id, likesCount: plants.likesCount, isPublic: plants.isPublic })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);

  if (!plant) throw new ServiceError('Plant not found', 404);
  if (!plant.isPublic) throw new ServiceError('Plant is not public', 403);

  const [existing] = await db
    .select({ id: plantLikes.id })
    .from(plantLikes)
    .where(and(eq(plantLikes.plantId, plantId), eq(plantLikes.userId, userId)))
    .limit(1);

  if (existing) {
    await db.delete(plantLikes).where(eq(plantLikes.id, existing.id));
    const [updated] = await db
      .update(plants)
      .set({ likesCount: Math.max(0, (plant.likesCount ?? 0) - 1), updatedAt: new Date() })
      .where(eq(plants.id, plantId))
      .returning({ likesCount: plants.likesCount });
    return { liked: false, likesCount: updated.likesCount };
  } else {
    await db.insert(plantLikes).values({ plantId, userId });
    const [updated] = await db
      .update(plants)
      .set({ likesCount: (plant.likesCount ?? 0) + 1, updatedAt: new Date() })
      .where(eq(plants.id, plantId))
      .returning({ likesCount: plants.likesCount });
    return { liked: true, likesCount: updated.likesCount };
  }
}
