import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateSupplierData, ListQuery, Paginated, UpdateSupplierData } from '@yamban/shared';
import { and, asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { suppliers } from '../db/schema/index.js';

export type SupplierRow = typeof suppliers.$inferSelect;

@Injectable()
export class SuppliersService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q: ListQuery): Promise<Paginated<SupplierRow>> {
    const conditions: SQL[] = [];
    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(suppliers.name, term),
          ilike(suppliers.contactPerson, term),
          ilike(suppliers.mobile, term),
        )!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, total] = await Promise.all([
      this.db
        .select()
        .from(suppliers)
        .where(where)
        .orderBy(asc(suppliers.name))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db.$count(
        this.db.select({ id: suppliers.id }).from(suppliers).where(where).as('s'),
      ),
    ]);

    return { items, page: q.page, pageSize: q.pageSize, total };
  }

  async get(id: string): Promise<SupplierRow> {
    const [row] = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Supplier not found.');
    return row;
  }

  async create(data: CreateSupplierData) {
    const [row] = await this.db.insert(suppliers).values(data).returning();
    return row!;
  }

  async update(id: string, data: UpdateSupplierData) {
    const [row] = await this.db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning();
    if (!row) throw new NotFoundException('Supplier not found.');
    return row;
  }

  async delete(id: string): Promise<void> {
    const [row] = await this.db
      .delete(suppliers)
      .where(eq(suppliers.id, id))
      .returning({ id: suppliers.id });
    if (!row) throw new NotFoundException('Supplier not found.');
  }
}
