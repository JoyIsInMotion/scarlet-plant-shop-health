/**
 * Wraps fetch with automatic token refresh on 401.
 * The /api/auth/refresh endpoint rotates the access_token cookie server-side,
 * so the retried request picks up the new cookie automatically.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 401) return res;

  const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
  if (!refreshRes.ok) return res;

  return fetch(url, init);
}
