import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import * as authService from '@/services/auth.service';
import { ServiceError } from '@/services/service-error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.refreshToken ?? req.cookies.get('refresh_token')?.value;

    if (!token) return err('Refresh token required', 400);

    const result = await authService.refresh(token);
    return ok(result);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    console.error('Refresh error:', e);
    return err('Internal server error', 500);
  }
}
