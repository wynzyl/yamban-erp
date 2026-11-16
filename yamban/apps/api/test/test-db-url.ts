/**
 * The integration tests' database. Defaults to `yamban_test` on the docker-compose Postgres
 * (host port 5555). Override with TEST_DATABASE_URL. The name must end in `_test`, so a typo
 * can never point the suite (which truncates every table) at the dev database.
 */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://yamban:yamban@localhost:5555/yamban_test';
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run integration tests against "${name}": the database name must end in _test.`);
  }
  return url;
}
