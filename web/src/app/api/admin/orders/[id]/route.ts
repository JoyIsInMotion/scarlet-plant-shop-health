import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as ordersService from '@/services/orders.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string }> };

async function patchOrder(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    return ok(await ordersService.updateOrder(id, await req.json()));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function deleteOrder(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    return ok(await ordersService.deleteOrder(id));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const PATCH = withAuth(patchOrder, { role: 'admin' });
export const DELETE = withAuth(deleteOrder, { role: 'admin' });
