import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as plantsService from '@/services/plants.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string; photoId: string }> };

async function deletePhoto(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { photoId } = await ctx.params;

  try {
    await plantsService.deletePlantPhoto(photoId, auth.sub);
    return ok({ message: 'Photo deleted' });
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const DELETE = withAuth(deletePhoto);
