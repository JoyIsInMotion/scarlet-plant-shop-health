import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as productsService from '@/services/products.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    return ok(await productsService.getProduct(id));
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
    return ok(await productsService.updateProduct(id, await req.json()));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function deleteHandler(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  await productsService.deactivateProduct(id);
  return ok({ message: 'Product deactivated' });
}

export const PUT = withAuth(putHandler, { role: 'admin' });
export const DELETE = withAuth(deleteHandler, { role: 'admin' });
