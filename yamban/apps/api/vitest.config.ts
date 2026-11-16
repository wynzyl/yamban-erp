import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './test/test-db-url.js';

export default defineConfig({
  test: {
    environment: 'node',
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.spec.ts'] },
      },
      {
        // Runs against a throwaway Postgres database (yamban_test by default; never the dev DB).
        extends: true,
        test: {
          name: 'integration',
          include: ['test/**/*.int.spec.ts'],
          globalSetup: ['test/global-setup.ts'],
          // One database for every integration file: run the files one after another.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: testDatabaseUrl(),
            JWT_ACCESS_SECRET: 'integration-tests-only-not-a-real-secret-000000',
          },
        },
      },
    ],
  },
});
