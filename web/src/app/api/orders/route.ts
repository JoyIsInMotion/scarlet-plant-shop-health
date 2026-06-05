import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as ordersService from '@/services/orders.service';
import { ServiceError } from '@/services/service-error';

async function getOrders(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  const sp = req.nextUrl.searchParams;
  const opts = {
    status: sp.get('status') ?? undefined,
    from: sp.get('from') ? new Date(sp.get('from')!) : undefined,
    to: sp.get('to') ? new Date(sp.get('to')!) : undefined,
    search: sp.get('search') ?? undefined,
  };

  return ok(
    await ordersService.listOrders(
      auth.sub,
      Math.min(parseInt(sp.get('limit') ?? '20', 10), 100),
      parseInt(sp.get('offset') ?? '0', 10),
      opts
    )
  );
}

async function createOrder(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  try {
    return ok(await ordersService.createOrder(auth.sub, await req.json()), 201);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET = withAuth(getOrders);
export const POST = withAuth(createOrder);
