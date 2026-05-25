import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { clearAuthCookies } from '@/lib/auth/cookies';
import * as authService from '@/services/auth.service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.refreshToken ?? req.cookies.get('refresh_token')?.value;

    await authService.logout(token);
    await clearAuthCookies();
    return ok({ message: 'Logged out' });
  } catch (e) {
    console.error('Logout error:', e);
    return err('Internal server error', 500);
  }
}
