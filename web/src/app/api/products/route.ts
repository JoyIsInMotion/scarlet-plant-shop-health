import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as productsService from '@/services/products.service';
import { ServiceError } from '@/services/service-error';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  return ok(
    await productsService.listProducts({
      limit: Math.min(parseInt(sp.get('limit') ?? '20', 10), 100),
      offset: parseInt(sp.get('offset') ?? '0', 10),
      search: sp.get('search') ?? undefined,
      category: sp.get('category') ?? undefined,
      sort: sp.get('sort') ?? 'createdAt',
      order: (sp.get('order') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
    })
  );
}

async function postHandler(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  try {
    return ok(await productsService.createProduct(await req.json()), 201);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const POST = withAuth(postHandler, { role: 'admin' });
