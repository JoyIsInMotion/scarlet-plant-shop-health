import { eq, ilike, or, and, count } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plantSpecies, plants } from '@/lib/db/schema';
import { ServiceError } from './service-error';

export async function listSpecies(query: {
  limit: number;
  offset: number;
  search?: string;
  difficulty?: string;
  verifiedOnly: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [];

  if (query.search) {
    conditions.push(
      or(
        ilike(plantSpecies.commonNameBg, `%${query.search}%`),
        ilike(plantSpecies.commonNameEn, `%${query.search}%`),
        ilike(plantSpecies.scientificName, `%${query.search}%`)
      )
    );
  }
  if (query.difficulty) {
    conditions.push(eq(plantSpecies.careDifficulty, query.difficulty as 'easy'));
  }
  if (query.verifiedOnly) {
    conditions.push(eq(plantSpecies.isVerified, true));
  }

  const base = db
    .select({
      id: plantSpecies.id,
      commonNameBg: plantSpecies.commonNameBg,
      commonNameEn: plantSpecies.commonNameEn,
      scientificName: plantSpecies.scientificName,
      family: plantSpecies.family,
      careDifficulty: plantSpecies.careDifficulty,
      imageUrl: plantSpecies.imageUrl,
      isVerified: plantSpecies.isVerified,
    })
    .from(plantSpecies);

  const items = conditions.length
    ? await base.where(and(...conditions)).limit(query.limit).offset(query.offset)
    : await base.limit(query.limit).offset(query.offset);

  return { items, limit: query.limit, offset: query.offset, hasMore: items.length === query.limit };
}

export async function getSpecies(id: string) {
  const [species] = await db.select().from(plantSpecies).where(eq(plantSpecies.id, id)).limit(1);
  if (!species) throw new ServiceError('Species not found', 404);

  const [{ value: usersGrowing }] = await db
    .select({ value: count() })
    .from(plants)
    .where(eq(plants.speciesId, id));

  return { ...species, usersGrowing: Number(usersGrowing) };
}

export async function createSpecies(data: {
  scientificName?: string;
  commonNameBg?: string | null;
  commonNameEn?: string | null;
  family?: string | null;
  nativeRegionBg?: string | null;
  nativeRegionEn?: string | null;
  careDifficulty?: string | null;
  descriptionBg?: string | null;
  descriptionEn?: string | null;
  careGuide?: Record<string, { bg: string; en: string }> | null;
  isVerified?: boolean;
}) {
  if (!data.scientificName) throw new ServiceError('scientificName is required', 400);

  const [species] = await db
    .insert(plantSpecies)
    .values({
      commonNameBg: data.commonNameBg ?? null,
      commonNameEn: data.commonNameEn ?? null,
      scientificName: data.scientificName,
      family: data.family ?? null,
      nativeRegionBg: data.nativeRegionBg ?? null,
      nativeRegionEn: data.nativeRegionEn ?? null,
      careDifficulty: (data.careDifficulty as 'easy' | 'moderate' | 'difficult') ?? null,
      descriptionBg: data.descriptionBg ?? null,
      descriptionEn: data.descriptionEn ?? null,
      careGuide: data.careGuide ?? null,
      isVerified: data.isVerified ?? false,
    })
    .returning();

  return species;
}

export async function updateSpecies(
  id: string,
  data: {
    commonNameBg?: string;
    commonNameEn?: string;
    scientificName?: string;
    family?: string;
    nativeRegionBg?: string;
    nativeRegionEn?: string;
    careDifficulty?: string;
    descriptionBg?: string;
    descriptionEn?: string;
    careGuide?: Record<string, { bg: string; en: string }>;
    isVerified?: boolean;
  }
) {
  const [existing] = await db
    .select({ id: plantSpecies.id })
    .from(plantSpecies)
    .where(eq(plantSpecies.id, id))
    .limit(1);

  if (!existing) throw new ServiceError('Species not found', 404);

  const [updated] = await db
    .update(plantSpecies)
    .set({
      commonNameBg: data.commonNameBg,
      commonNameEn: data.commonNameEn,
      scientificName: data.scientificName,
      family: data.family,
      nativeRegionBg: data.nativeRegionBg,
      nativeRegionEn: data.nativeRegionEn,
      careDifficulty: data.careDifficulty as 'easy' | 'moderate' | 'difficult' | undefined,
      descriptionBg: data.descriptionBg,
      descriptionEn: data.descriptionEn,
      careGuide: data.careGuide,
      isVerified: data.isVerified,
      updatedAt: new Date(),
    })
    .where(eq(plantSpecies.id, id))
    .returning();

  return updated;
}
