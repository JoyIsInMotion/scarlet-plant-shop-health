import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { ok, err } from '@/lib/api/response';
import * as adminService from '@/services/admin.service';

async function getAdminStats(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return err('Unauthorized', 401);

  return ok(await adminService.getAdminStats());
}

export const GET = withAuth(getAdminStats, { role: 'admin' });
