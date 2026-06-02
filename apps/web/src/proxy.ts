import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ['/plants', '/scan', '/profile', '/admin'];
const adminPaths = ['/admin'];

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

  // Let API routes pass through without locale or auth handling
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
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
