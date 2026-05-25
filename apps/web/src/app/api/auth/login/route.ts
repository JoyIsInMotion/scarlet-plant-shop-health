import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { loginSchema } from '@scarlet/shared';
import { setAuthCookies } from '@/lib/auth/cookies';
import * as authService from '@/services/auth.service';
import { ServiceError } from '@/services/service-error';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.errors[0].message, 400);

    const result = await authService.login(parsed.data.email, parsed.data.password);
    await setAuthCookies(result.accessToken, result.refreshToken);
    return ok(result);
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    console.error('Login error:', e);
    return err('Internal server error', 500);
  }
}
