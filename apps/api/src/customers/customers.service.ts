import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCustomerData, ListQuery, Paginated, UpdateCustomerData } from '@yamban/shared';
import { and, asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { customers, organizations } from '../db/schema/index.js';

export type CustomerRow = typeof customers.$inferSelect & { organizationName: string | null };

/** Reference resource: copy this module's shape for suppliers, materials, products... */
@Injectable()
export class CustomersService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q: ListQuery): Promise<Paginated<CustomerRow>> {
    const conditions: SQL[] = [eq(customers.active, true)];
    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(customers.firstName, term),
          ilike(customers.lastName, term),
          ilike(customers.mobile, term),
          ilike(organizations.name, term),
        )!,
      );
    }
    const where = and(...conditions);

    const [items, total] = await Promise.all([
      this.db
        .select({ ...cols, organizationName: organizations.name })
        .from(customers)
        .leftJoin(organizations, eq(organizations.id, customers.organizationId))
        .where(where)
        .orderBy(asc(customers.lastName), asc(customers.firstName))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db
        .$count(
          this.db
            .select({ id: customers.id })
            .from(customers)
            .leftJoin(organizations, eq(organizations.id, customers.organizationId))
            .where(where)
            .as('c'),
        ),
    ]);

    return { items, page: q.page, pageSize: q.pageSize, total };
  }

  async get(id: string): Promise<CustomerRow> {
    const [row] = await this.db
      .select({ ...cols, organizationName: organizations.name })
      .from(customers)
      .leftJoin(organizations, eq(organizations.id, customers.organizationId))
      .where(eq(customers.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Customer not found.');
    return row;
  }

  async create(data: CreateCustomerData) {
    const [row] = await this.db.insert(customers).values(data).returning();
    return row!;
  }

  async update(id: string, data: UpdateCustomerData) {
    const [row] = await this.db.update(customers).set(data).where(eq(customers.id, id)).returning();
    if (!row) throw new NotFoundException('Customer not found.');
    return row;
  }

  async delete(id: string): Promise<void> {
    const [row] = await this.db
      .update(customers)
      .set({ active: false })
      .where(eq(customers.id, id))
      .returning({ id: customers.id });
    if (!row) throw new NotFoundException('Customer not found.');
  }
}

const cols = {
  id: customers.id,
  firstName: customers.firstName,
  lastName: customers.lastName,
  organizationId: customers.organizationId,
  mobile: customers.mobile,
  email: customers.email,
  facebook: customers.facebook,
  birthday: customers.birthday,
  streetPurok: customers.streetPurok,
  barangay: customers.barangay,
  municipality: customers.municipality,
  province: customers.province,
  notes: customers.notes,
  active: customers.active,
  createdAt: customers.createdAt,
  updatedAt: customers.updatedAt,
};
