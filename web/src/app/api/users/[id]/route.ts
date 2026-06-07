import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as usersService from '@/services/users.service';
import { ServiceError } from '@/services/service-error';

type Ctx = { params: Promise<{ id: string }> };

async function getUserHandler(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    return ok(await usersService.getUserById(id));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function updateUserHandler(req: NextRequest, ctx: Ctx) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await ctx.params;

  try {
    const body = await req.json();
    return ok(await usersService.updateUserAdmin(id, auth.sub, {
      role: body.role,
      isActive: body.isActive,
      phone: body.phone,
    }));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET   = withAuth(getUserHandler, { role: 'admin' });
export const PATCH = withAuth(updateUserHandler, { role: 'admin' });
