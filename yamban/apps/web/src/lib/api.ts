import 'server-only';
import type { SessionUser } from '@yamban/shared';
import { cookies } from 'next/headers';

const API = process.env.API_INTERNAL_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

/**
 * Server-side fetch to the NestJS API, forwarding the user's cookies.
 * Use from Server Components, Route Handlers and Server Actions.
 * (Client components call `/api/...` directly; the Next.js rewrite forwards it.)
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
      cookie: jar.toString(),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      message?: string;
      fieldErrors?: Record<string, string[]>;
    };
    throw new ApiError(res.status, body.message ?? res.statusText, body.fieldErrors);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as { data: T };
  return body.data;
}

/** The signed-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    return await apiFetch<SessionUser>('/auth/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}
