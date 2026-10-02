import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { Public } from '../common/decorators/public.decorator.js';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(@InjectDb() private readonly db: Database) {}

  @Get()
  async check() {
    try {
      await this.db.execute(sql`select 1`);
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
  }
}
