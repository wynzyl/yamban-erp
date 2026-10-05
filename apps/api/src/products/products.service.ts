import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddProductProcessData,
  CreateProductData,
  ListQuery,
  Paginated,
  ProductionStage,
  UpdateProductData,
  UpdateProductProcessData,
} from '@yamban/shared';
import { asc, eq, ilike, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { machines, products, productSizeProcesses } from '../db/schema/index.js';

export interface ProductListRow {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
  active: boolean;
  createdAt: Date;
}

export interface ProductProcessRow {
  id: string;
  machineId: string;
  machineName: string;
  machineStage: ProductionStage;
  powerKw: string;
  minutesPerPiece: string;
}

export interface ProductDetailRow {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  processes: ProductProcessRow[];
}

@Injectable()
export class ProductsService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q?: ListQuery): Promise<Paginated<ProductListRow>> {
    const page = q?.page ?? 1;
    const pageSize = q?.pageSize ?? 20;
    const conditions: SQL[] = [];

    if (q?.search) {
      const term = `%${q.search.replace(/[%_\\\\]/g, '\\\\$&')}%`;
      conditions.push(ilike(products.name, term));
    }

    const where = conditions.length ? (conditions.length === 1 ? conditions[0] : undefined) : undefined;

    const allProducts = await this.db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        defaultPrice: products.defaultPrice,
        active: products.active,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(where)
      .orderBy(asc(products.name));

    const total = allProducts.length;
    const paginatedProducts = allProducts.slice((page - 1) * pageSize, page * pageSize);

    return { items: paginatedProducts, page, pageSize, total };
  }

  async get(id: string): Promise<ProductDetailRow> {
    const [product] = await this.db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        defaultPrice: products.defaultPrice,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) throw new NotFoundException('Product not found.');

    const processes = await this.db
      .select({
        id: productSizeProcesses.id,
        machineId: productSizeProcesses.machineId,
        machineName: machines.name,
        machineStage: machines.stage,
        powerKw: machines.powerKw,
        minutesPerPiece: productSizeProcesses.minutesPerPiece,
      })
      .from(productSizeProcesses)
      .innerJoin(machines, eq(machines.id, productSizeProcesses.machineId))
      .where(eq(productSizeProcesses.productId, id))
      .orderBy(asc(machines.stage));

    return { ...product, processes };
  }

  async create(data: CreateProductData) {
    const [product] = await this.db
      .insert(products)
      .values({
        name: data.name,
        description: data.description,
        defaultPrice: data.defaultPrice,
      })
      .returning();

    return product!;
  }

  async update(id: string, data: UpdateProductData) {
    const [existing] = await this.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Product not found.');

    const updates: Partial<typeof products.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.defaultPrice !== undefined) updates.defaultPrice = data.defaultPrice;

    if (Object.keys(updates).length > 0) {
      await this.db.update(products).set(updates).where(eq(products.id, id));
    }

    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    const [product] = await this.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!product) throw new NotFoundException('Product not found.');

    // Soft delete by setting active = false
    await this.db.update(products).set({ active: false }).where(eq(products.id, id));
  }

  /** Add a machine process to a product. */
  async addProcess(productId: string, data: AddProductProcessData): Promise<ProductProcessRow> {
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) throw new NotFoundException('Product not found.');

    const [row] = await this.db
      .insert(productSizeProcesses)
      .values({
        productId,
        machineId: data.machineId,
        minutesPerPiece: data.minutesPerPiece,
      })
      .returning();

    // Fetch with machine info
    const [process] = await this.db
      .select({
        id: productSizeProcesses.id,
        machineId: productSizeProcesses.machineId,
        machineName: machines.name,
        machineStage: machines.stage,
        powerKw: machines.powerKw,
        minutesPerPiece: productSizeProcesses.minutesPerPiece,
      })
      .from(productSizeProcesses)
      .innerJoin(machines, eq(machines.id, productSizeProcesses.machineId))
      .where(eq(productSizeProcesses.id, row!.id))
      .limit(1);

    return process!;
  }

  /** Update a product process. */
  async updateProcess(
    productId: string,
    processId: string,
    data: UpdateProductProcessData,
  ): Promise<ProductProcessRow> {
    const [existing] = await this.db
      .select({ id: productSizeProcesses.id })
      .from(productSizeProcesses)
      .where(eq(productSizeProcesses.id, processId))
      .limit(1);

    if (!existing) throw new NotFoundException('Process not found.');

    await this.db
      .update(productSizeProcesses)
      .set({ minutesPerPiece: data.minutesPerPiece })
      .where(eq(productSizeProcesses.id, processId));

    const [process] = await this.db
      .select({
        id: productSizeProcesses.id,
        machineId: productSizeProcesses.machineId,
        machineName: machines.name,
        machineStage: machines.stage,
        powerKw: machines.powerKw,
        minutesPerPiece: productSizeProcesses.minutesPerPiece,
      })
      .from(productSizeProcesses)
      .innerJoin(machines, eq(machines.id, productSizeProcesses.machineId))
      .where(eq(productSizeProcesses.id, processId))
      .limit(1);

    return process!;
  }

  /** Delete a product process. */
  async deleteProcess(productId: string, processId: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: productSizeProcesses.id })
      .from(productSizeProcesses)
      .where(eq(productSizeProcesses.id, processId))
      .limit(1);

    if (!existing) throw new NotFoundException('Process not found.');

    await this.db.delete(productSizeProcesses).where(eq(productSizeProcesses.id, processId));
  }
}
