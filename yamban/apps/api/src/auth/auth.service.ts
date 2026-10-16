import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import type { LoginInput, SessionUser } from '@yamban/shared';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { sessions, users } from '../db/schema/index.js';
import { REFRESH_REUSE_GRACE_MS } from './auth.constants.js';
import { type AccessPayload, hashToken, newRefreshToken } from './tokens.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

const INVALID = 'Email or password is incorrect.';
const ENDED = 'Your session has ended. Sign in again.';

@Injectable()
export class AuthService {
  /** Verified against when the email is unknown, so timing does not reveal which emails exist. */
  private dummyHash: Promise<string> | undefined;

  constructor(
    @InjectDb() private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginInput, meta: ClientMeta): Promise<IssuedTokens> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${input.email}`)
      .limit(1);

    if (!user) {
      this.dummyHash ??= hash('not-a-real-password');
      await verify(await this.dummyHash, input.password).catch(() => false);
      throw new UnauthorizedException(INVALID);
    }
    const ok = await verify(user.passwordHash, input.password).catch(() => false);
    if (!ok || !user.active) throw new UnauthorizedException(INVALID);

    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    return this.issue(this.db, toSessionUser(user), randomUUID(), meta);
  }

  /**
   * Rotates a refresh token. Reuse of an already-rotated token outside the grace
   * window means it may have been stolen: the whole family is revoked.
   */
  async refresh(rawToken: string, meta: ClientMeta): Promise<IssuedTokens> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const outcome = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, tokenHash))
        .for('update')
        .limit(1);
      if (!row || row.expiresAt <= now) return { kind: 'invalid' as const };

      if (row.revokedAt) {
        // A ROTATED token shown again moments later is a race (two tabs, parallel
        // requests). Anything else, or a family already flagged, is treated as theft.
        const withinGrace =
          row.revokedReason === 'ROTATED' &&
          now.getTime() - row.revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
        const familyKilled =
          (await tx.$count(
            sessions,
            and(eq(sessions.familyId, row.familyId), ne(sessions.revokedReason, 'ROTATED')),
          )) > 0;
        if (!withinGrace || familyKilled) {
          await tx
            .update(sessions)
            .set({ revokedAt: now, revokedReason: 'REUSE' })
            .where(and(eq(sessions.familyId, row.familyId), isNull(sessions.revokedAt)));
          return { kind: 'reuse' as const };
        }
      } else {
        await tx
          .update(sessions)
          .set({ revokedAt: now, revokedReason: 'ROTATED' })
          .where(eq(sessions.id, row.id));
      }

      const [user] = await tx.select().from(users).where(eq(users.id, row.userId)).limit(1);
      if (!user?.active) return { kind: 'invalid' as const };

      return { kind: 'ok' as const, tokens: await this.issue(tx, toSessionUser(user), row.familyId, meta) };
    });

    if (outcome.kind !== 'ok') throw new UnauthorizedException(ENDED);
    return outcome.tokens;
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const [row] = await this.db
      .select({ familyId: sessions.familyId })
      .from(sessions)
      .where(eq(sessions.tokenHash, hashToken(rawToken)))
      .limit(1);
    if (!row) return;
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date(), revokedReason: 'LOGOUT' })
      .where(and(eq(sessions.familyId, row.familyId), isNull(sessions.revokedAt)));
  }

  async me(userId: string): Promise<SessionUser> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.active) throw new UnauthorizedException(ENDED);
    return toSessionUser(user);
  }

  private async issue(
    db: Pick<Database, 'insert'>,
    user: SessionUser,
    familyId: string,
    meta: ClientMeta,
  ): Promise<IssuedTokens> {
    const payload: AccessPayload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = newRefreshToken();
    await db.insert(sessions).values({
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
      userAgent: meta.userAgent?.slice(0, 300),
      ip: meta.ip,
    });
    return { accessToken, refreshToken, user };
  }
}

function toSessionUser(u: typeof users.$inferSelect): SessionUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}
