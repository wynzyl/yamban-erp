import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

export function createPool(connectionString: string): pg.Pool {
  const pool = new pg.Pool({ connectionString, max: 10 });
  // Postgres `date` columns come back as 'YYYY-MM-DD' strings, not JS Dates
  // shifted to UTC midnight (which would show the wrong day in Asia/Manila).
  pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);
  return pool;
}

export function createDb(pool: pg.Pool): Database {
  return drizzle({ client: pool, schema, casing: 'snake_case' });
}
