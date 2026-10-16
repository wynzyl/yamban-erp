/** Shared by proxy.ts and server code. No Node-only or React imports here. */

export const ACCESS_COOKIE = 'yb_at';
export const REFRESH_COOKIE = 'yb_rt';

/** Paths reachable without a session. */
export const PUBLIC_PATHS = ['/login'];

/** Seconds until the JWT expires, or -1 if it cannot be read. Does not verify; the API does. */
export function secondsUntilExpiry(jwt: string | undefined): number {
  if (!jwt) return -1;
  try {
    const part = jwt.split('.')[1];
    if (!part) return -1;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp - Math.floor(Date.now() / 1000) : -1;
  } catch {
    return -1;
  }
}
