import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as catalogService from '@/services/catalog.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    return ok(await catalogService.getSpecies(id));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function putHandler(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    return ok(await catalogService.updateSpecies(id, await req.json()));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const PUT = withAuth(putHandler, { role: 'admin' });
