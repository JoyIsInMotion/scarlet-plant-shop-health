import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Public: /shop, /catalog, /login, /scan (logged-out users can browse + try a scan)
// Logged-in only: /plants, /community, /orders, /profile, /dashboard, /admin
const protectedPaths = ['/plants', '/community', '/orders', '/profile', '/dashboard', '/admin'];
const adminPaths = ['/admin'];

// CORS for the REST API consumed by the Expo mobile app.
//
// Why this lives here: the `[[headers]]` block in netlify.toml is applied to
// static assets, not to the Next.js functions that serve `/api/*`, so those
// headers never reach API responses. Next.js also has no built-in preflight
// handling — a route that only exports GET/POST answers an OPTIONS request with
// 405. Browser-based clients (Expo web, and any client sending an
// `Authorization` header + JSON, which triggers a preflight) therefore can't
// talk to the API without this. Native Expo Go doesn't enforce CORS, but
// handling it here makes the API usable from every mobile target uniformly.
const CORS_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const CORS_ALLOWED_HEADERS = 'Content-Type, Authorization';

// Optional comma-separated allowlist (e.g. "https://app.scarlet.com,http://localhost:8081").
// Falls back to "*", which is safe here: the API is stateless and Bearer-authed,
// so it never relies on cookies being sent cross-origin (we never set
// Access-Control-Allow-Credentials).
const corsAllowlist = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function resolveCorsOrigin(request: NextRequest): string {
  if (corsAllowlist.length === 0) return '*';
  const origin = request.headers.get('origin');
  if (origin && corsAllowlist.includes(origin)) return origin;
  return corsAllowlist[0];
}

function withCors(response: NextResponse, origin: string): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', CORS_ALLOWED_HEADERS);
  response.headers.set('Access-Control-Max-Age', '86400');
  // When the origin is reflected (not "*"), caches must key on it.
  if (origin !== '*') response.headers.append('Vary', 'Origin');
  return response;
}

function isProtected(pathname: string): boolean {
  // Strip locale prefix (e.g. /bg/dashboard → /dashboard)
  const stripped = pathname.replace(/^\/(bg|en)/, '') || pathname;
  return protectedPaths.some((p) => stripped.startsWith(p));
}

function isAdmin(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(bg|en)/, '') || pathname;
  return adminPaths.some((p) => stripped.startsWith(p));
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes skip locale/auth handling, but get CORS + preflight handling so
  // the Expo mobile app (and any browser-based client) can call them.
  if (pathname.startsWith('/api/')) {
    const origin = resolveCorsOrigin(request);
    if (request.method === 'OPTIONS') {
      return withCors(new NextResponse(null, { status: 204 }), origin);
    }
    return withCors(NextResponse.next(), origin);
  }

  // Run next-intl middleware for all other routes
  const intlResponse = intlMiddleware(request);

  // Check auth for protected routes
  if (isProtected(pathname)) {
    const token = request.cookies.get('access_token')?.value;
    if (!token) {
      const locale = pathname.startsWith('/en') ? 'en' : 'bg';
      const loginUrl = new URL(locale === 'en' ? '/en/login' : '/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Basic JWT structure check (full verification happens in API routes)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid');
      const payload = JSON.parse(atob(parts[1]));

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        const locale = pathname.startsWith('/en') ? 'en' : 'bg';
        const loginUrl = new URL(locale === 'en' ? '/en/login' : '/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      if (isAdmin(pathname) && payload.role !== 'admin') {
        const locale = pathname.startsWith('/en') ? 'en' : 'bg';
        return NextResponse.redirect(new URL(locale === 'en' ? '/en/plants' : '/plants', request.url));
      }
    } catch {
      const locale = pathname.startsWith('/en') ? 'en' : 'bg';
      return NextResponse.redirect(new URL(locale === 'en' ? '/en/login' : '/login', request.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
