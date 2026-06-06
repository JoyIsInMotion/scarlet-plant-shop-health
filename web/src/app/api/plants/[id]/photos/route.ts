import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as plantsService from '@/services/plants.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string }> };

async function listPhotos(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    const photos = await plantsService.listPlantPhotos(id, auth.sub);
    return ok(photos);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function uploadPhoto(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    const form = await req.formData();
    const file = form.get('image') as File | null;

    if (!file) return err('No image provided', 400);

    // Upload to R2, then record the photo URL in the DB
    const { url } = await plantsService.uploadPlantImage(id, auth.sub, file);

    // Add photo entry to DB
    const photo = await plantsService.addPlantPhoto(id, auth.sub, url);
    return ok(photo);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET = withAuth(listPhotos);
export const POST = withAuth(uploadPhoto);
