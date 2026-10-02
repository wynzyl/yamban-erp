import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { env } from '../config/env.js';
import { createDb, createPool } from './client.js';

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');

/** Inject the Drizzle client with `@InjectDb() private readonly db: Database`. */
export const InjectDb = () => Inject(DB);

@Global()
@Module({
  providers: [
    { provide: PG_POOL, useFactory: () => createPool(env.DATABASE_URL) },
    { provide: DB, inject: [PG_POOL], useFactory: (pool: pg.Pool) => createDb(pool) },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
