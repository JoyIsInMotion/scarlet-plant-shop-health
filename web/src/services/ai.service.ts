import { eq, ilike } from 'drizzle-orm';
import { db } from '@/db';
import { plants, aiAnalyses, plantSpecies } from '@/db/schema';
import { analyzePlantImage, MODEL_NAME } from '@/lib/ai/plant-analyzer';
import { checkAIRateLimit } from '@/lib/ai/rate-limit';
import { uploadToR2 } from '@/lib/r2/client';
import { MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '@scarlet/shared';
import { randomUUID } from 'crypto';
import { ServiceError } from './service-error';
import { createScheduleFromSpecies } from './care.service';

async function enforceRateLimit(userId: string, role: string) {
  try {
    await checkAIRateLimit(userId, role as 'user' | 'admin');
  } catch (e: unknown) {
    const error = e as { status?: number; message: string };
    if (error.status === 429) throw new ServiceError(error.message, 429);
    throw e;
  }
}

export async function analyzeSavedPlant(plantId: string, userId: string, role: string) {
  const [plant] = await db
    .select({ userId: plants.userId, imageUrl: plants.imageUrl, speciesConfirmed: plants.speciesConfirmed })
    .from(plants)
    .where(eq(plants.id, plantId))
    .limit(1);

  if (!plant) throw new ServiceError('Plant not found', 404);
  if (plant.userId !== userId && role !== 'admin') throw new ServiceError('Forbidden', 403);
  if (!plant.imageUrl) throw new ServiceError('Plant has no image to analyze', 400);

  await enforceRateLimit(userId, role);

  // Some image CDNs (iNaturalist, Unsplash, Wikimedia) reject header-less
  // server requests with 403 even though browsers load them fine — send a
  // browser-like User-Agent/Accept and follow redirects.
  const imgRes = await fetch(plant.imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ScarletBot/1.0; +https://scarletflowers.netlify.app)',
      Accept: 'image/avif,image/webp,image/png,image/jpeg,*/*',
    },
    redirect: 'follow',
  });
  if (!imgRes.ok) throw new ServiceError(`Failed to fetch plant image (${imgRes.status})`, 502);
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const rawType = imgRes.headers.get('content-type') ?? 'image/jpeg';
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'] as const;
  const mimeType = allowedMimes.find((m) => rawType.startsWith(m)) ?? 'image/jpeg';

  let analysis: Awaited<ReturnType<typeof analyzePlantImage>>;
  try {
    analysis = await analyzePlantImage(imgBuffer, mimeType);
  } catch (e) {
    console.error('AI analysis error:', e);
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    if (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate limit') || msg.includes('rate_limit')) {
      throw new ServiceError('AI service quota exceeded. Please try again later.', 503);
    }
    throw new ServiceError('AI analysis failed. Please try again.', 500);
  }

  // Only ever match against existing catalog species — never create new ones
  // from a user's AI scan. The catalog is curated; users can link to it but
  // not add to it.
  let matchedSpeciesId: string | null = null;
  if (analysis.species.scientific_name) {
    const [match] = await db
      .select({ id: plantSpecies.id })
      .from(plantSpecies)
      .where(ilike(plantSpecies.scientificName, analysis.species.scientific_name))
      .limit(1);

    if (match) matchedSpeciesId = match.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedAnalysis] = await (db.insert(aiAnalyses) as any)
    .values({
      plantId,
      userId,
      imageUrl: plant.imageUrl,
      healthScore: analysis.health.health_score,
      overallCondition: analysis.health.overall_condition,
      issues: analysis.health.issues,
      careRecommendations: analysis.health.care_recommendations,
      wateringNeeded: analysis.health.watering_needed,
      identifiedCommonName: analysis.species.common_name,
      identifiedScientificName: analysis.species.scientific_name,
      identifiedFamily: analysis.species.family,
      identifiedNativeRegion: analysis.species.native_region,
      identifiedCareDifficulty: analysis.species.care_difficulty,
      matchedSpeciesId,
      confidence: analysis.confidence,
      modelUsed: MODEL_NAME,
    })
    .returning();

  if (['medium', 'high'].includes(analysis.confidence)) {
    const plantUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (analysis.health.health_score !== null) plantUpdates.healthScore = analysis.health.health_score;
    const linksNewSpecies = matchedSpeciesId && !plant.speciesConfirmed;
    if (linksNewSpecies) plantUpdates.speciesId = matchedSpeciesId;
    await db.update(plants).set(plantUpdates).where(eq(plants.id, plantId));

    // Mirror updatePlant: auto-linking a species also (re)builds its care schedule
    if (linksNewSpecies) await createScheduleFromSpecies(plantId, matchedSpeciesId!);
  }

  const matchedSpecies = matchedSpeciesId
    ? (await db.select().from(plantSpecies).where(eq(plantSpecies.id, matchedSpeciesId)).limit(1))[0]
    : null;

  return { analysis: savedAnalysis, matchedSpecies, advice: analysis.friendly_advice ?? null, careBasics: analysis.care_basics ?? null };
}

// Shared pipeline: validate → upload to R2 → run AI → match an existing
// catalog species (read-only). Used by both the logged-in and anonymous scans.
async function runQuickAnalysis(file: File, keyPrefix: string) {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new ServiceError('File too large (max 5MB)', 400);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ServiceError('Invalid file type. Use JPEG, PNG, or WebP', 400);
  }

  const ext = file.type.split('/')[1];
  const key = `${keyPrefix}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let imageUrl: string;
  try {
    imageUrl = await uploadToR2(key, buffer, file.type);
  } catch (e) {
    console.error('R2 upload error:', e);
    throw new ServiceError('Failed to upload image. Check storage configuration.', 500);
  }

  let analysis: Awaited<ReturnType<typeof analyzePlantImage>>;
  try {
    analysis = await analyzePlantImage(buffer, file.type as 'image/jpeg');
  } catch (e) {
    console.error('AI analysis error:', e);
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    if (msg.includes('quota') || msg.includes('resource_exhausted') || msg.includes('rate limit') || msg.includes('rate_limit')) {
      throw new ServiceError('AI service quota exceeded. Please try again later.', 503);
    }
    throw new ServiceError('AI analysis failed. Please try again.', 500);
  }

  // Only match; quick scans never create new catalog entries
  let matchedSpeciesId: string | null = null;
  if (analysis.species.scientific_name) {
    const [match] = await db
      .select({ id: plantSpecies.id })
      .from(plantSpecies)
      .where(ilike(plantSpecies.scientificName, analysis.species.scientific_name))
      .limit(1);
    if (match) matchedSpeciesId = match.id;
  }

  const matchedSpecies = matchedSpeciesId
    ? (await db.select().from(plantSpecies).where(eq(plantSpecies.id, matchedSpeciesId)).limit(1))[0]
    : null;

  return { analysis, imageUrl, matchedSpeciesId, matchedSpecies };
}

export async function quickScan(userId: string, role: string, file: File) {
  await enforceRateLimit(userId, role);

  const { analysis, imageUrl, matchedSpeciesId, matchedSpecies } = await runQuickAnalysis(file, `scans/${userId}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [savedAnalysis] = await (db.insert(aiAnalyses) as any)
    .values({
      plantId: null,
      userId,
      imageUrl,
      healthScore: analysis.health.health_score,
      overallCondition: analysis.health.overall_condition,
      issues: analysis.health.issues,
      careRecommendations: analysis.health.care_recommendations,
      wateringNeeded: analysis.health.watering_needed,
      identifiedCommonName: analysis.species.common_name,
      identifiedScientificName: analysis.species.scientific_name,
      identifiedFamily: analysis.species.family,
      identifiedNativeRegion: analysis.species.native_region,
      identifiedCareDifficulty: analysis.species.care_difficulty,
      matchedSpeciesId,
      confidence: analysis.confidence,
      modelUsed: MODEL_NAME,
    })
    .returning();

  return { analysis: savedAnalysis, imageUrl, matchedSpecies, advice: analysis.friendly_advice ?? null, careBasics: analysis.care_basics ?? null };
}

// Anonymous teaser scan: runs the full analysis but does NOT persist it
// (aiAnalyses requires a user) and isn't counted against the per-user daily
// limit. The route caps anonymous callers at a single scan via a cookie.
export async function quickScanAnonymous(file: File) {
  const { analysis, imageUrl, matchedSpeciesId, matchedSpecies } = await runQuickAnalysis(file, 'scans/anon');

  // Mirror the saved-row fields the UI reads, without touching the DB
  const ephemeral = {
    id: null,
    plantId: null,
    userId: null,
    imageUrl,
    healthScore: analysis.health.health_score,
    overallCondition: analysis.health.overall_condition,
    issues: analysis.health.issues,
    careRecommendations: analysis.health.care_recommendations,
    wateringNeeded: analysis.health.watering_needed,
    identifiedCommonName: analysis.species.common_name,
    identifiedScientificName: analysis.species.scientific_name,
    identifiedFamily: analysis.species.family,
    identifiedNativeRegion: analysis.species.native_region,
    identifiedCareDifficulty: analysis.species.care_difficulty,
    matchedSpeciesId,
    confidence: analysis.confidence,
    modelUsed: MODEL_NAME,
    analyzedAt: new Date().toISOString(),
  };

  return { analysis: ephemeral, imageUrl, matchedSpecies, advice: analysis.friendly_advice ?? null, careBasics: analysis.care_basics ?? null };
}
