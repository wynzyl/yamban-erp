import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createdAt, id, updatedAt } from './_columns.js';
import { userRole } from './enums.js';

export const users = pgTable(
  'users',
  {
    id: id(),
    email: text().notNull(),
    name: text().notNull(),
    passwordHash: text().notNull(),
    role: userRole().notNull().default('STAFF'),
    active: boolean().notNull().default(true),
    lastLoginAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('users_email_lower_uq').on(sql`lower(${t.email})`)],
);

/** Why a refresh token stopped working. Only ROTATED tokens get the reuse grace window. */
export const sessionRevokeReason = pgEnum('session_revoke_reason', ['ROTATED', 'LOGOUT', 'REUSE']);

/**
 * One row per issued refresh token. Rotation creates a new row in the same
 * family; presenting a revoked token outside the grace window revokes the family.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: uuid().notNull(),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    revokedReason: sessionRevokeReason(),
    userAgent: text(),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_uq').on(t.tokenHash),
    index('sessions_family_idx').on(t.familyId),
    index('sessions_user_idx').on(t.userId),
  ],
);
