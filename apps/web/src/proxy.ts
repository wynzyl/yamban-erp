import { type NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, PUBLIC_PATHS, REFRESH_COOKIE, secondsUntilExpiry } from '@/lib/session';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

/**
 * Runs before every page render:
 *  1. If the access token is missing or about to expire but a refresh token exists,
 *     rotate it with the API and pass the new cookies both to the browser and to
 *     this request, so Server Components render with a valid session.
 *  2. Send signed-out visitors to /login, and signed-in visitors away from it.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let setCookies: string[] = [];

  if (secondsUntilExpiry(access) < 30 && refresh) {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      headers: forwardHeaders(request, `${REFRESH_COOKIE}=${refresh}`),
      cache: 'no-store',
    }).catch(() => null);

    if (res) {
      setCookies = res.headers.getSetCookie();
      for (const line of setCookies) {
        const [pair] = line.split(';');
        const eq = pair?.indexOf('=') ?? -1;
        if (!pair || eq < 0) continue;
        const name = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        if (value) request.cookies.set(name, value);
        else request.cookies.delete(name);
      }
      access = res.ok ? request.cookies.get(ACCESS_COOKIE)?.value : undefined;
    }
  }

  const signedIn = secondsUntilExpiry(access) > 0;

  let response: NextResponse;
  if (!signedIn && !isPublic) {
    const url = new URL('/login', request.url);
    if (pathname !== '/') url.searchParams.set('next', pathname + search);
    response = NextResponse.redirect(url);
  } else if (signedIn && isPublic) {
    response = NextResponse.redirect(new URL('/', request.url));
  } else {
    // Forward the (possibly refreshed) cookies to Server Components in this request.
    response = NextResponse.next({ request: { headers: request.headers } });
  }

  for (const line of setCookies) response.headers.append('set-cookie', line);
  return response;
}

function forwardHeaders(request: NextRequest, cookie: string): HeadersInit {
  const headers: Record<string, string> = { cookie };
  const ua = request.headers.get('user-agent');
  const xff = request.headers.get('x-forwarded-for');
  if (ua) headers['user-agent'] = ua;
  if (xff) headers['x-forwarded-for'] = xff;
  return headers;
}

export const config = {
  // Pages only: not the API rewrite, Next internals or static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$).*)'],
};
