import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { withAuth, getAuthFromRequest } from '@/lib/auth/middleware';
import { signAccessToken } from '@/lib/auth/jwt';

function req(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  return new NextRequest('http://localhost/api/test', { headers });
}

const ctx = { params: Promise.resolve({}) };
const okHandler = async () => new Response('ok', { status: 200 });

describe('withAuth (authorization)', () => {
  it('returns 401 without a token', async () => {
    const res = await withAuth(okHandler)(req(), ctx);
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await withAuth(okHandler)(req('bad.token.value'), ctx);
    expect(res.status).toBe(401);
  });

  it('allows a valid user token on a normal route', async () => {
    const res = await withAuth(okHandler)(req(signAccessToken('u1', 'user')), ctx);
    expect(res.status).toBe(200);
  });

  it('blocks a non-admin from an admin-only route (403)', async () => {
    const res = await withAuth(okHandler, { role: 'admin' })(req(signAccessToken('u1', 'user')), ctx);
    expect(res.status).toBe(403);
  });

  it('allows an admin on an admin route and exposes the payload', async () => {
    let seen: { sub: string; role: string } | null = null;
    const handler = withAuth(async (r) => {
      seen = getAuthFromRequest(r);
      return new Response('ok', { status: 200 });
    }, { role: 'admin' });

    const res = await handler(req(signAccessToken('admin1', 'admin')), ctx);
    expect(res.status).toBe(200);
    expect(seen).not.toBeNull();
    expect(seen!.sub).toBe('admin1');
    expect(seen!.role).toBe('admin');
  });
});
