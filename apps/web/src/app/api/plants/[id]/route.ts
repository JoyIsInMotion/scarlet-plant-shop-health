import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as plantsService from '@/services/plants.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string }> };

async function getPlant(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    return ok(await plantsService.getPlant(id, auth.sub, auth.role));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function updatePlant(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    return ok(await plantsService.updatePlant(id, auth.sub, auth.role, await req.json()));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function deletePlant(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    await plantsService.archivePlant(id, auth.sub, auth.role);
    return ok({ message: 'Plant archived' });
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET = withAuth(getPlant);
export const PUT = withAuth(updatePlant);
export const DELETE = withAuth(deletePlant);
