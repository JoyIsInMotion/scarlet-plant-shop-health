import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as careService from '@/services/care.service';
import { ServiceError } from '@/services/service-error';

async function getCareLogsHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await params;

  const { searchParams } = new URL(req.url);
  const limit    = Math.min(50, Math.max(1, parseInt(searchParams.get('limit')  ?? '10')));
  const offset   = Math.max(0, parseInt(searchParams.get('offset') ?? '0'));
  const careType = searchParams.get('careType') ?? undefined;

  try {
    return ok(await careService.listCareLogs(id, auth.sub, { limit, offset, careType }));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function createCareLogHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await params;

  try {
    const body = await req.json();
    if (!body.careType) return err('careType is required', 400);
    return ok(await careService.createCareLog(id, auth.sub, {
      careType: body.careType,
      photoUrl: body.photoUrl ?? undefined,
      notes:    body.notes    ?? undefined,
    }));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET  = withAuth(getCareLogsHandler);
export const POST = withAuth(createCareLogHandler);
