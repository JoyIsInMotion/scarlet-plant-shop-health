import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as careService from '@/services/care.service';
import { ServiceError } from '@/services/service-error';

async function getScheduleHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await params;

  try {
    return ok(await careService.getSchedule(id, auth.sub));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

async function updateScheduleHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);
  const { id } = await params;

  try {
    const body = await req.json();
    return ok(await careService.updateSchedule(id, auth.sub, {
      wateringIntervalDays:    body.wateringIntervalDays    !== undefined ? Number(body.wateringIntervalDays)    : undefined,
      fertilizingIntervalDays: body.fertilizingIntervalDays !== undefined ? Number(body.fertilizingIntervalDays) : undefined,
      repottingIntervalMonths: body.repottingIntervalMonths !== undefined ? Number(body.repottingIntervalMonths) : undefined,
      mistingNeeded:           body.mistingNeeded           !== undefined ? Boolean(body.mistingNeeded)          : undefined,
      notes:                   body.notes                   !== undefined ? String(body.notes)                   : undefined,
    }));
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}

export const GET   = withAuth(getScheduleHandler);
export const PATCH = withAuth(updateScheduleHandler);
