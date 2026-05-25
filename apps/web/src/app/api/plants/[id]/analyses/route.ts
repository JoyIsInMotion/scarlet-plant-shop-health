import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as plantsService from '@/services/plants.service';
import { ServiceError } from '@/services/service-error';

async function getAnalyses(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await params;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '10'));
  const offset = parseInt(searchParams.get('offset') ?? '0');

  try {
    return ok(await plantsService.getAnalyses(id, auth.sub, limit, offset));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET = withAuth(getAnalyses);
