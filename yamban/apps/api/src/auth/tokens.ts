import { createHash, randomBytes } from 'node:crypto';

/** 256-bit opaque refresh token. Only its hash is stored. */
export const newRefreshToken = (): string => randomBytes(32).toString('base64url');

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export interface AccessPayload {
  sub: string;
  email: string;
  name: string;
  role: 'OWNER' | 'STAFF' | 'DESIGNER';
}
