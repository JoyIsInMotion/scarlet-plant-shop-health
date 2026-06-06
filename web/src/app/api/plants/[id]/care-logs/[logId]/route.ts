import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as careService from '@/services/care.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string; logId: string }> };

async function updateCareLog(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { logId } = await ctx.params;

  try {
    const data = await req.json();
    const log = await careService.updateCareLog(logId, auth.sub, data);
    return ok(log);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function deleteCareLog(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { logId } = await ctx.params;

  try {
    await careService.deleteCareLog(logId, auth.sub);
    return ok({ message: 'Care log deleted' });
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const PUT = withAuth(updateCareLog);
export const DELETE = withAuth(deleteCareLog);
