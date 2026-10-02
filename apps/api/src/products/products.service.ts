import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateProductData, ListQuery, Paginated, UpdateProductData } from '@yamban/shared';
import { and, asc, desc, eq, ilike, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { products, productSizes } from '../db/schema/index.js';

export interface ProductListRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sizeCount: number;
  createdAt: Date;
}

export interface ProductSizeRow {
  id: string;
  size: string;
  defaultPrice: string;
}

export interface ProductDetailRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  sizes: ProductSizeRow[];
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

    const where = conditions.length ? and(...conditions) : undefined;

    // Get products with size count
    const allProducts = await this.db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        active: products.active,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(where)
      .orderBy(asc(products.name));

    // Get size counts for all products
    const sizeCounts = await this.db
      .select({
        productId: productSizes.productId,
      })
      .from(productSizes);

    const sizeCountMap = new Map<string, number>();
    for (const s of sizeCounts) {
      sizeCountMap.set(s.productId, (sizeCountMap.get(s.productId) ?? 0) + 1);
    }

    const total = allProducts.length;
    const paginatedProducts = allProducts.slice((page - 1) * pageSize, page * pageSize);

    const items: ProductListRow[] = paginatedProducts.map((p) => ({
      ...p,
      sizeCount: sizeCountMap.get(p.id) ?? 0,
    }));

    return { items, page, pageSize, total };
  }

  async get(id: string): Promise<ProductDetailRow> {
    const [product] = await this.db
      .select({
        id: products.id,
        name: products.name,
        description: products.description,
        active: products.active,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) throw new NotFoundException('Product not found.');

    const sizes = await this.db
      .select({
        id: productSizes.id,
        size: productSizes.size,
        defaultPrice: productSizes.defaultPrice,
      })
      .from(productSizes)
      .where(eq(productSizes.productId, id))
      .orderBy(asc(productSizes.size));

    return { ...product, sizes };
  }

  async create(data: CreateProductData) {
    return await this.db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({
          name: data.name,
          description: data.description,
        })
        .returning();

      if (data.sizes && data.sizes.length > 0) {
        await tx.insert(productSizes).values(
          data.sizes.map((s) => ({
            productId: product!.id,
            size: s.size,
            defaultPrice: s.defaultPrice,
          })),
        );
      }

      return product!;
    });
  }

  async update(id: string, data: UpdateProductData) {
    const [existing] = await this.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Product not found.');

    return await this.db.transaction(async (tx) => {
      // Update product
      const updates: Partial<typeof products.$inferInsert> = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description;

      if (Object.keys(updates).length > 0) {
        await tx.update(products).set(updates).where(eq(products.id, id));
      }

      // Update sizes if provided
      if (data.sizes !== undefined) {
        // Delete existing sizes
        await tx.delete(productSizes).where(eq(productSizes.productId, id));

        // Insert new sizes
        if (data.sizes.length > 0) {
          await tx.insert(productSizes).values(
            data.sizes.map((s) => ({
              productId: id,
              size: s.size,
              defaultPrice: s.defaultPrice,
            })),
          );
        }
      }

      return this.get(id);
    });
  }

  async delete(id: string): Promise<void> {
    const [product] = await this.db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
    if (!product) throw new NotFoundException('Product not found.');

    // Soft delete by setting active = false
    await this.db.update(products).set({ active: false }).where(eq(products.id, id));
  }
}
