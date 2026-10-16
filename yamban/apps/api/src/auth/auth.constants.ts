import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

export const ACCESS_COOKIE = 'yb_at';
export const REFRESH_COOKIE = 'yb_rt';

/**
 * A rotated refresh token presented again within this window is treated as a
 * race (two tabs, or parallel requests through the Next.js proxy) rather than theft.
 */
export const REFRESH_REUSE_GRACE_MS = 15_000;

/**
 * Cookies are first-party: the browser talks to Next.js, which rewrites /api/* to
 * this API, so SameSite=Lax is enough and no cross-site cookie is needed.
 * Path is "/" because the Next.js proxy reads yb_rt on page navigations to refresh.
 */
const base: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
};

export const accessCookieOptions = (): CookieOptions => ({
  ...base,
  maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
});

export const refreshCookieOptions = (): CookieOptions => ({
  ...base,
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
});

export const clearCookieOptions = (): CookieOptions => ({ ...base });
