import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { ok } from '@/lib/api/response';
import * as ordersService from '@/services/orders.service';

async function getAllOrders(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const opts = {
    status: sp.get('status') ?? undefined,
    from: sp.get('from') ? new Date(sp.get('from')!) : undefined,
    to: sp.get('to') ? new Date(sp.get('to')!) : undefined,
    search: sp.get('search') ?? undefined,
  };

  return ok(
    await ordersService.listAllOrders(
      Math.min(parseInt(sp.get('limit') ?? '20', 10), 100),
      parseInt(sp.get('offset') ?? '0', 10),
      opts
    )
  );
}

export const GET = withAuth(getAllOrders, { role: 'admin' });
