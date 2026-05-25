import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as plantsService from '@/services/plants.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string }> };

async function getStats(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  const sp = req.nextUrl.searchParams;
  try {
    return ok(
      await plantsService.getPlantStats(id, auth.sub, auth.role, {
        limit: Math.min(parseInt(sp.get('limit') ?? '50', 10), 500),
        offset: parseInt(sp.get('offset') ?? '0', 10),
        metric: sp.get('metric') ?? undefined,
        from: sp.get('from') ? new Date(sp.get('from')!) : undefined,
        to: sp.get('to') ? new Date(sp.get('to')!) : undefined,
      })
    );
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function createStat(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    return ok(await plantsService.createPlantStat(id, auth.sub, await req.json()), 201);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET = withAuth(getStats);
export const POST = withAuth(createStat);
