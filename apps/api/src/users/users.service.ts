import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import type { CreateUserInput, SessionUser, UserRole } from '@yamban/shared';
import { asc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { users } from '../db/schema/index.js';

const publicColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  active: users.active,
  lastLoginAt: users.lastLoginAt,
};

@Injectable()
export class UsersService {
  constructor(@InjectDb() private readonly db: Database) {}

  list(role?: UserRole) {
    const query = this.db.select(publicColumns).from(users);
    if (role) {
      return query.where(eq(users.role, role)).orderBy(asc(users.name));
    }
    return query.orderBy(asc(users.name));
  }

  async create(input: CreateUserInput): Promise<SessionUser> {
    const taken = await this.db.$count(users, sql`lower(${users.email}) = ${input.email}`);
    if (taken) throw new ConflictException('An account with this email already exists.');
    const [row] = await this.db
      .insert(users)
      .values({ email: input.email, name: input.name, role: input.role, passwordHash: await hash(input.password) })
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
    return row!;
  }
}
