import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { testDatabaseUrl } from './test-db-url.js';

/** Creates the test database if it is missing and applies every migration. */
export default async function setup(): Promise<void> {
  const url = new URL(testDatabaseUrl());
  const name = url.pathname.replace(/^\//, '');

  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
  } catch (err) {
    throw new Error(
      `Cannot reach Postgres for the integration tests (${url.host}). Start it with "docker compose up -d postgres". ${String(err)}`,
    );
  }
  const { rowCount } = await admin.query('select 1 from pg_database where datname = $1', [name]);
  if (!rowCount) await admin.query(`create database "${name}"`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: url.toString(), max: 1 });
  await migrate(drizzle({ client: pool }), {
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
  });
  await pool.end();
}
