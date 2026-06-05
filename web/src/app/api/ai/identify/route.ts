import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import { analyzePlantImage } from '@/lib/ai/plant-analyzer';
import { ilike } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plantSpecies } from '@/lib/db/schema';
import { MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '@scarlet/shared';

async function identifyHandler(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('image') as File | null;
  if (!file) return err('No image provided', 400);
  if (file.size > MAX_FILE_SIZE_BYTES) return err('File too large (max 5MB)', 400);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return err('Invalid file type. Use JPEG, PNG, or WebP', 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

  let analysis: Awaited<ReturnType<typeof analyzePlantImage>>;
  try {
    analysis = await analyzePlantImage(buffer, mimeType);
  } catch {
    return err('AI identification failed. Please try again.', 500);
  }

  const { species, confidence } = analysis;
  if (!species.scientific_name && !species.common_name) {
    return ok({ identified: false, confidence });
  }

  // Try to find a match in our species DB
  let matchedSpeciesId: string | null = null;
  let matchedCommonNameEn: string | null = null;
  let matchedCommonNameBg: string | null = null;
  let matchedScientificName: string | null = species.scientific_name;

  if (species.scientific_name) {
    const [match] = await db
      .select({
        id: plantSpecies.id,
        commonNameEn: plantSpecies.commonNameEn,
        commonNameBg: plantSpecies.commonNameBg,
        scientificName: plantSpecies.scientificName,
      })
      .from(plantSpecies)
      .where(ilike(plantSpecies.scientificName, `%${species.scientific_name}%`))
      .limit(1);

    if (match) {
      matchedSpeciesId      = match.id;
      matchedCommonNameEn   = match.commonNameEn;
      matchedCommonNameBg   = match.commonNameBg;
      matchedScientificName = match.scientificName;
    }
  }

  return ok({
    identified:           true,
    confidence,
    commonNameEn:         species.common_name,
    scientificName:       matchedScientificName,
    matchedSpeciesId,
    matchedCommonNameEn,
    matchedCommonNameBg,
    inOurDatabase:        !!matchedSpeciesId,
  });
}

export const POST = withAuth(identifyHandler);
