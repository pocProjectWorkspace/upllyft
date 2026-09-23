import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Server-side auth gate (PERFORMANCE_AUDIT.md #36).
 *
 * The API client keeps the access and refresh tokens in cookies as well as
 * localStorage (packages/api-client/src/client.ts), so a request with neither
 * cookie is a logged-out visitor. For routes whose client shells already
 * hard-redirect to /login, send that redirect from the edge instead of first
 * shipping the whole app shell, mounting AuthProvider, and calling /auth/me.
 *
 * Token validity is deliberately NOT checked here: an expired access token
 * with a live refresh token is refreshed by the client, and a dead pair still
 * ends in the client's own redirect, so no loop is possible.
 */
const ACCESS_COOKIE = 'upllyft_access_token';
const REFRESH_COOKIE = 'upllyft_refresh_token';

/** Prefixes whose pages/shells already require a session. */
const PROTECTED_PREFIXES = [
  '/settings',
  '/community',
  '/booking',
  '/screening',
  '/resources',
  '/cases',
  '/clinic',
];

/** Exceptions inside protected prefixes that are reachable without a session. */
const PUBLIC_EXCEPTIONS = ['/cases/intake'];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isProtected(pathname: string) {
  if (pathname === '/') return true; // dashboard
  if (PUBLIC_EXCEPTIONS.some((p) => matches(pathname, p))) return false;
  return PROTECTED_PREFIXES.some((p) => matches(pathname, p));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const hasSession =
    request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);
  if (hasSession) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  login.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Skip API proxying, static assets, the image optimizer and metadata files.
    '/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|svg|ico|jpg|jpeg|webp)$).*)',
  ],
};
