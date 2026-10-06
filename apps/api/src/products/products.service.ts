import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddProductProcessData,
  AddRecipeMaterialData,
  CreateProductData,
  ListQuery,
  Paginated,
  ProductionStage,
  UpdateProductData,
  UpdateProductProcessData,
  UpdateProductStageLaborRateData,
  UpdateRecipeMaterialData,
} from '@yamban/shared';
import { PRODUCTION_STAGES } from '@yamban/shared';
import { and, asc, eq, ilike, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { machines, materials, productRecipes, products, productSizeProcesses, productStages, recipeMaterials } from '../db/schema/index.js';

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

export interface ProductStageRow {
  id: string;
  stage: ProductionStage;
  sequence: number;
  laborRatePerPiece: string | null;
}

export interface RecipeMaterialRow {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: string;
  quantityPerPiece: string;
  stage: ProductionStage;
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
  stages: ProductStageRow[];
  recipe: RecipeMaterialRow[];
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

    const [processes, stages, recipeData] = await Promise.all([
      this.db
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
        .orderBy(asc(machines.stage)),
      this.db
        .select({
          id: productStages.id,
          stage: productStages.stage,
          sequence: productStages.sequence,
          laborRatePerPiece: productStages.laborRatePerPiece,
        })
        .from(productStages)
        .where(eq(productStages.productId, id))
        .orderBy(asc(productStages.sequence)),
      this.getRecipeMaterials(id),
    ]);

    return { ...product, processes, stages, recipe: recipeData };
  }

  /** Get recipe materials for a product. */
  private async getRecipeMaterials(productId: string): Promise<RecipeMaterialRow[]> {
    const [recipe] = await this.db
      .select({ id: productRecipes.id })
      .from(productRecipes)
      .where(eq(productRecipes.productId, productId))
      .limit(1);

    if (!recipe) return [];

    return this.db
      .select({
        id: recipeMaterials.id,
        materialId: recipeMaterials.materialId,
        materialName: materials.name,
        materialColor: materials.color,
        materialUnit: materials.unit,
        quantityPerPiece: recipeMaterials.quantityPerPiece,
        stage: recipeMaterials.stage,
      })
      .from(recipeMaterials)
      .innerJoin(materials, eq(materials.id, recipeMaterials.materialId))
      .where(eq(recipeMaterials.recipeId, recipe.id))
      .orderBy(asc(recipeMaterials.stage), asc(materials.name));
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

  /** Update labor rate for a product stage. */
  async updateStageLaborRate(
    productId: string,
    stageId: string,
    data: UpdateProductStageLaborRateData,
  ): Promise<{ id: string; stage: ProductionStage; laborRatePerPiece: string | null }> {
    const [existing] = await this.db
      .select({
        id: productStages.id,
        stage: productStages.stage,
        productId: productStages.productId,
      })
      .from(productStages)
      .where(and(eq(productStages.id, stageId), eq(productStages.productId, productId)))
      .limit(1);

    if (!existing) throw new NotFoundException('Product stage not found.');

    await this.db
      .update(productStages)
      .set({ laborRatePerPiece: data.laborRatePerPiece })
      .where(eq(productStages.id, stageId));

    const [updated] = await this.db
      .select({
        id: productStages.id,
        stage: productStages.stage,
        laborRatePerPiece: productStages.laborRatePerPiece,
      })
      .from(productStages)
      .where(eq(productStages.id, stageId))
      .limit(1);

    return {
      id: updated!.id,
      stage: updated!.stage,
      laborRatePerPiece: updated!.laborRatePerPiece,
    };
  }

  /** Upsert labor rate for a product stage by stage name. Creates the stage if it doesn't exist. */
  async upsertStageLaborRate(
    productId: string,
    stage: ProductionStage,
    data: UpdateProductStageLaborRateData,
  ): Promise<{ id: string; stage: ProductionStage; laborRatePerPiece: string | null }> {
    // Verify product exists
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) throw new NotFoundException('Product not found.');

    // Get sequence from PRODUCTION_STAGES
    const sequence = PRODUCTION_STAGES.indexOf(stage) + 1;

    // Upsert the stage
    const [result] = await this.db
      .insert(productStages)
      .values({
        productId,
        stage,
        sequence,
        laborRatePerPiece: data.laborRatePerPiece,
      })
      .onConflictDoUpdate({
        target: [productStages.productId, productStages.stage],
        set: { laborRatePerPiece: data.laborRatePerPiece },
      })
      .returning();

    return {
      id: result!.id,
      stage: result!.stage,
      laborRatePerPiece: result!.laborRatePerPiece,
    };
  }

  /** Add a material to a product's recipe. Creates the recipe if it doesn't exist. */
  async addRecipeMaterial(productId: string, data: AddRecipeMaterialData): Promise<RecipeMaterialRow> {
    // Verify product exists
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) throw new NotFoundException('Product not found.');

    // Get or create recipe
    let [recipe] = await this.db
      .select({ id: productRecipes.id })
      .from(productRecipes)
      .where(eq(productRecipes.productId, productId))
      .limit(1);

    if (!recipe) {
      const [newRecipe] = await this.db
        .insert(productRecipes)
        .values({ productId })
        .returning();
      recipe = newRecipe!;
    }

    // Insert recipe material
    const [inserted] = await this.db
      .insert(recipeMaterials)
      .values({
        recipeId: recipe.id,
        materialId: data.materialId,
        quantityPerPiece: data.quantityPerPiece,
        stage: data.stage,
      })
      .returning();

    // Fetch with material info
    const [result] = await this.db
      .select({
        id: recipeMaterials.id,
        materialId: recipeMaterials.materialId,
        materialName: materials.name,
        materialColor: materials.color,
        materialUnit: materials.unit,
        quantityPerPiece: recipeMaterials.quantityPerPiece,
        stage: recipeMaterials.stage,
      })
      .from(recipeMaterials)
      .innerJoin(materials, eq(materials.id, recipeMaterials.materialId))
      .where(eq(recipeMaterials.id, inserted!.id))
      .limit(1);

    return result!;
  }

  /** Update a recipe material. */
  async updateRecipeMaterial(
    productId: string,
    recipeMaterialId: string,
    data: UpdateRecipeMaterialData,
  ): Promise<RecipeMaterialRow> {
    // Verify the recipe material exists and belongs to this product
    const [existing] = await this.db
      .select({ id: recipeMaterials.id, recipeId: recipeMaterials.recipeId })
      .from(recipeMaterials)
      .innerJoin(productRecipes, eq(productRecipes.id, recipeMaterials.recipeId))
      .where(
        and(
          eq(recipeMaterials.id, recipeMaterialId),
          eq(productRecipes.productId, productId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Recipe material not found.');

    // Update
    await this.db
      .update(recipeMaterials)
      .set({
        quantityPerPiece: data.quantityPerPiece,
        stage: data.stage,
      })
      .where(eq(recipeMaterials.id, recipeMaterialId));

    // Fetch updated
    const [result] = await this.db
      .select({
        id: recipeMaterials.id,
        materialId: recipeMaterials.materialId,
        materialName: materials.name,
        materialColor: materials.color,
        materialUnit: materials.unit,
        quantityPerPiece: recipeMaterials.quantityPerPiece,
        stage: recipeMaterials.stage,
      })
      .from(recipeMaterials)
      .innerJoin(materials, eq(materials.id, recipeMaterials.materialId))
      .where(eq(recipeMaterials.id, recipeMaterialId))
      .limit(1);

    return result!;
  }

  /** Delete a recipe material. */
  async deleteRecipeMaterial(productId: string, recipeMaterialId: string): Promise<void> {
    // Verify the recipe material exists and belongs to this product
    const [existing] = await this.db
      .select({ id: recipeMaterials.id })
      .from(recipeMaterials)
      .innerJoin(productRecipes, eq(productRecipes.id, recipeMaterials.recipeId))
      .where(
        and(
          eq(recipeMaterials.id, recipeMaterialId),
          eq(productRecipes.productId, productId),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException('Recipe material not found.');

    await this.db.delete(recipeMaterials).where(eq(recipeMaterials.id, recipeMaterialId));
  }
}
