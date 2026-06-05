import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as usersService from '@/services/users.service';
import { ServiceError } from '@/services/service-error';

async function uploadAvatar(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  const form = await req.formData();
  const file = form.get('avatar');
  if (!(file instanceof File)) return err('No file uploaded', 400);

  try {
    return ok(await usersService.uploadAvatar(auth.sub, file));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const POST = withAuth(uploadAvatar);
