import { defineConfig } from 'drizzle-kit';
import { loadRootEnv } from './src/config/load-env.js';

loadRootEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
