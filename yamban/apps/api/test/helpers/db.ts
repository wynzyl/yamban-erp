import { sql } from 'drizzle-orm';
import { createDb, createPool, type Database } from '../../src/db/client.js';
import { testDatabaseUrl } from '../test-db-url.js';

/** One pool per test file. Close it in `afterAll`. */
export function openTestDb(): { db: Database; close: () => Promise<void> } {
  const pool = createPool(testDatabaseUrl());
  return { db: createDb(pool), close: () => pool.end() };
}

/** Empties every application table (migrations live in the `drizzle` schema and are kept). */
export async function resetDb(db: Database): Promise<void> {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await db.execute(sql.raw(`truncate table ${list} restart identity cascade`));
}
