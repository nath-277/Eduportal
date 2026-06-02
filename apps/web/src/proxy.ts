import { NextResponse, type NextRequest } from 'next/server';

const COOKIE_NAME = 'eduportal-token';
const PUBLIC_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];
const ROLE_PREFIXES = ['/student', '/lecturer', '/admin'] as const;

type Role = 'STUDENT' | 'LECTURER' | 'ADMIN';

interface JwtPayload {
  role?: Role;
  userId?: string;
  exp?: number;
  iat?: number;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const padded = payload + '==='.slice((payload.length + 3) % 4);
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function roleHomeFor(role: Role): string {
  if (role === 'STUDENT') return '/student/dashboard';
  if (role === 'LECTURER') return '/lecturer/dashboard';
  return '/admin/dashboard';
}

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Decode role if possible (signature not verified — server still checks)
  const payload = token ? decodeJwt(token) : null;
  const role = payload?.role ?? null;
  const expired = payload?.exp ? payload.exp * 1000 < Date.now() : false;

  // 1) Logged-in users visiting a public auth page → bounce to their dashboard
  if (token && !expired && role && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL(roleHomeFor(role), request.url));
  }

  // 2) Protected route without a valid token → redirect to /login with a returnTo
  const isProtected = ROLE_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && (!token || expired)) {
    const url = new URL('/login', request.url);
    url.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(url);
  }

  // 3) Wrong role for a role-prefixed route → bounce to the user's own dashboard
  if (token && !expired && role && isProtected) {
    const expectedPrefix =
      role === 'STUDENT' ? '/student' : role === 'LECTURER' ? '/lecturer' : '/admin';
    if (!pathname.startsWith(expectedPrefix)) {
      return NextResponse.redirect(new URL(roleHomeFor(role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, static files, and the favicon.
     * Run on every other route so login redirects and role guards work.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
