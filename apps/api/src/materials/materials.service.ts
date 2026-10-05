import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateMaterialData, ListQuery, Paginated, UpdateMaterialData } from '@yamban/shared';
import { and, asc, eq, ilike, or, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { materials, suppliers } from '../db/schema/index.js';

export type MaterialRow = typeof materials.$inferSelect & { supplierName: string | null };

@Injectable()
export class MaterialsService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q: ListQuery): Promise<Paginated<MaterialRow>> {
    const conditions: SQL[] = [eq(materials.active, true)];
    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(materials.name, term),
          ilike(materials.color, term),
          ilike(materials.category, term),
          ilike(suppliers.name, term),
        )!,
      );
    }
    const where = and(...conditions);

    const [items, total] = await Promise.all([
      this.db
        .select({ ...cols, supplierName: suppliers.name })
        .from(materials)
        .leftJoin(suppliers, eq(suppliers.id, materials.defaultSupplierId))
        .where(where)
        .orderBy(asc(materials.category), asc(materials.name))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db
        .$count(
          this.db
            .select({ id: materials.id })
            .from(materials)
            .leftJoin(suppliers, eq(suppliers.id, materials.defaultSupplierId))
            .where(where)
            .as('m'),
        ),
    ]);

    return { items, page: q.page, pageSize: q.pageSize, total };
  }

  async get(id: string): Promise<MaterialRow> {
    const [row] = await this.db
      .select({ ...cols, supplierName: suppliers.name })
      .from(materials)
      .leftJoin(suppliers, eq(suppliers.id, materials.defaultSupplierId))
      .where(eq(materials.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Material not found.');
    return row;
  }

  async create(data: CreateMaterialData) {
    const { unitCost, ...rest } = data;
    const [row] = await this.db
      .insert(materials)
      .values({
        ...rest,
        averageUnitCost: unitCost ?? '0',
      })
      .returning();
    return row!;
  }

  async update(id: string, data: UpdateMaterialData) {
    const { unitCost, ...rest } = data;
    const updateData: Partial<typeof materials.$inferInsert> = { ...rest };
    if (unitCost !== undefined) {
      updateData.averageUnitCost = unitCost;
    }
    const [row] = await this.db.update(materials).set(updateData).where(eq(materials.id, id)).returning();
    if (!row) throw new NotFoundException('Material not found.');
    return row;
  }

  async delete(id: string): Promise<void> {
    const [row] = await this.db
      .update(materials)
      .set({ active: false })
      .where(eq(materials.id, id))
      .returning({ id: materials.id });
    if (!row) throw new NotFoundException('Material not found.');
  }
}

const cols = {
  id: materials.id,
  name: materials.name,
  color: materials.color,
  category: materials.category,
  unit: materials.unit,
  purchaseUnit: materials.purchaseUnit,
  purchaseQuantity: materials.purchaseQuantity,
  defaultSupplierId: materials.defaultSupplierId,
  reorderLevel: materials.reorderLevel,
  stockOnHand: materials.stockOnHand,
  averageUnitCost: materials.averageUnitCost,
  active: materials.active,
  createdAt: materials.createdAt,
  updatedAt: materials.updatedAt,
};
