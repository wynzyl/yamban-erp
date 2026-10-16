import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { materialCategories, materials } from '../db/schema/index.js';

export interface CategoryRow {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class CategoriesService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(): Promise<CategoryRow[]> {
    return this.db
      .select({
        id: materialCategories.id,
        name: materialCategories.name,
        createdAt: materialCategories.createdAt,
      })
      .from(materialCategories)
      .orderBy(asc(materialCategories.name));
  }

  async get(id: string): Promise<CategoryRow> {
    const [category] = await this.db
      .select({
        id: materialCategories.id,
        name: materialCategories.name,
        createdAt: materialCategories.createdAt,
      })
      .from(materialCategories)
      .where(eq(materialCategories.id, id))
      .limit(1);

    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  async create(data: { name: string }): Promise<CategoryRow> {
    const [category] = await this.db
      .insert(materialCategories)
      .values({ name: data.name.toUpperCase() })
      .returning();

    return category!;
  }

  async update(id: string, data: { name: string }): Promise<CategoryRow> {
    const [existing] = await this.db
      .select({ id: materialCategories.id })
      .from(materialCategories)
      .where(eq(materialCategories.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Category not found.');

    const [updated] = await this.db
      .update(materialCategories)
      .set({ name: data.name.toUpperCase() })
      .where(eq(materialCategories.id, id))
      .returning();

    return updated!;
  }

  async delete(id: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: materialCategories.id, name: materialCategories.name })
      .from(materialCategories)
      .where(eq(materialCategories.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Category not found.');

    // Check if any materials use this category (materials store category name as text)
    const [usage] = await this.db
      .select({ id: materials.id })
      .from(materials)
      .where(eq(materials.category, existing.name))
      .limit(1);

    if (usage) {
      throw new BadRequestException('Cannot delete category that is in use by materials.');
    }

    await this.db.delete(materialCategories).where(eq(materialCategories.id, id));
  }
}
