import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as plantsService from '@/services/plants.service';
import { ServiceError } from '@/services/service-error';

async function getPlants(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get('limit') ?? '20', 10), 100);
  const cursor = sp.get('cursor') ?? undefined;

  return ok(await plantsService.listPlants(auth.sub, limit, cursor));
}

async function createPlant(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  try {
    return ok(await plantsService.createPlant(auth.sub, await req.json()), 201);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET = withAuth(getPlants);
export const POST = withAuth(createPlant);
