import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as usersService from '@/services/users.service';

async function listUsers(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  return ok(
    await usersService.listUsers({
      search: searchParams.get('search') ?? undefined,
      page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
      limit: Math.min(100, parseInt(searchParams.get('limit') ?? '20')),
    })
  );
}

export const GET = withAuth(listUsers, { role: 'admin' });
