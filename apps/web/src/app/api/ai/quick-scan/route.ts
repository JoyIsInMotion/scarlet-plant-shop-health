import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as aiService from '@/services/ai.service';
import { ServiceError } from '@/services/service-error';

async function quickScan(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return err('No image provided', 400);

  try {
    return ok(await aiService.quickScan(auth.sub, auth.role, file));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const POST = withAuth(quickScan);
