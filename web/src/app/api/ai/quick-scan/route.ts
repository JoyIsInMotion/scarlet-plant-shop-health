import { NextRequest, NextResponse } from 'next/server';
import { ok, err } from '@/lib/api/response';
import { verifyAccessToken, type JWTPayload } from '@/lib/auth/jwt';
import * as aiService from '@/services/ai.service';
import { ServiceError } from '@/services/service-error';

// Logged-out visitors get one free scan per day, tracked by this cookie. It's a
// teaser to drive sign-ups — not a hard security boundary (a user can clear
// cookies), which is fine because anonymous scans aren't persisted or costly
// beyond a single AI call.
const ANON_SCAN_COOKIE = 'anon_scan_used';
const ANON_COOKIE_MAX_AGE = 60 * 60 * 24; // 1 day

function resolveAuth(req: NextRequest): JWTPayload | null {
  const token =
    req.headers.get('authorization')?.replace('Bearer ', '') ??
    req.cookies.get('access_token')?.value;
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = resolveAuth(req);

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return err('No image provided', 400);

  // Logged-in: normal persisted scan with the per-user daily limit
  if (auth) {
    try {
      return ok(await aiService.quickScan(auth.sub, auth.role, file));
    } catch (e) {
      if (e instanceof ServiceError) return err(e.message, e.status);
      throw e;
    }
  }

  // Anonymous: one free scan, then prompt to register/login
  if (req.cookies.get(ANON_SCAN_COOKIE)?.value) {
    return NextResponse.json(
      { success: false, error: 'Sign up or log in to keep scanning', code: 'ANON_LIMIT' },
      { status: 401 },
    );
  }

  try {
    const data = await aiService.quickScanAnonymous(file);
    const res = NextResponse.json({ success: true, data });
    res.cookies.set(ANON_SCAN_COOKIE, '1', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ANON_COOKIE_MAX_AGE,
    });
    return res;
  } catch (e) {
    if (e instanceof ServiceError) return err(e.message, e.status);
    throw e;
  }
}
