import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = [
  '/layout-20',
  '/orders',
  '/couriers',
  '/restaurants',
  '/finance',
  '/analytics',
  '/payouts',
  '/promocodes',
  '/users',
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasAccessToken = Boolean(
    request.cookies.get('admin_access_token')?.value,
  );

  const hasRefreshToken = Boolean(
    request.cookies.get('admin_refresh_token')?.value,
  );

  const hasSession = hasAccessToken || hasRefreshToken;

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    loginUrl.searchParams.set('reason', 'missing_session');
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/layout-20/:path*',
    '/orders/:path*',
    '/couriers/:path*',
    '/restaurants/:path*',
    '/finance/:path*',
    '/analytics/:path*',
    '/payouts/:path*',
    '/promocodes/:path*',
    '/users/:path*',
  ],
};