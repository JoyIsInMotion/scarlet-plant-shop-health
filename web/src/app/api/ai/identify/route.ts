import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as aiService from '@/services/ai.service';
import { ServiceError } from '@/services/service-error';
import { MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_TYPES } from '@scarlet/shared';

async function identifyHandler(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('image') as File | null;
  if (!file) return err('No image provided', 400);
  if (file.size > MAX_FILE_SIZE_BYTES) return err('File too large (max 5MB)', 400);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return err('Invalid file type. Use JPEG, PNG, or WebP', 400);
  }

  try {
    return ok(await aiService.identifySpecies(file));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const POST = withAuth(identifyHandler);
