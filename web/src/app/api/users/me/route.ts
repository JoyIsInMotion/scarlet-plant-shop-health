import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as usersService from '@/services/users.service';
import { ServiceError } from '@/services/service-error';

async function getMe(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  try {
    return ok(await usersService.getMe(auth.sub));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function putMe(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  const body = await req.json();
  return ok(await usersService.updateMe(auth.sub, body));
}

export const GET = withAuth(getMe);
export const PUT = withAuth(putMe);
