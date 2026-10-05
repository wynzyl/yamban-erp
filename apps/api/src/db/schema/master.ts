import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, money, qty, unitCost, updatedAt } from './_columns.js';
import { garmentSize, productionStage, stockUnit } from './enums.js';

export const organizations = pgTable('organizations', {
  id: id(),
  name: text().notNull(),
  type: text(), // school, barangay, team, parish, police station...
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const customers = pgTable(
  'customers',
  {
    id: id(),
    firstName: text().notNull(),
    lastName: text().notNull().default(''),
    organizationId: uuid().references(() => organizations.id, { onDelete: 'set null' }),
    mobile: text(), // E.164, +639171234567
    email: text(),
    facebook: text(),
    birthday: date(),
    streetPurok: text(),
    barangay: text(),
    municipality: text(),
    province: text(),
    notes: text(),
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('customers_org_idx').on(t.organizationId), index('customers_name_idx').on(t.lastName, t.firstName)],
);

export const suppliers = pgTable('suppliers', {
  id: id(),
  name: text().notNull(),
  contactPerson: text(),
  mobile: text(),
  email: text(),
  address: text(),
  bankDetails: text(), // Bank name, account number, account name
  notes: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const materials = pgTable(
  'materials',
  {
    id: id(),
    name: text().notNull(),
    color: text(),
    category: text().notNull(), // FABRIC, INK, PAPER, THREAD, TRIM, PACKAGING
    unit: stockUnit().notNull(),
    purchaseUnit: text().notNull(), // ROLL, BOTTLE, REAM, PACK
    purchaseQuantity: qty().notNull(), // 1 roll = 78 yd
    defaultSupplierId: uuid().references(() => suppliers.id, { onDelete: 'set null' }),
    reorderLevel: qty().notNull().default('0'),
    stockOnHand: qty().notNull().default('0'), // cache of SUM(inventory_transactions.quantity)
    averageUnitCost: unitCost().notNull().default('0'), // moving average
    active: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('materials_supplier_idx').on(t.defaultSupplierId)],
);

export const products = pgTable('products', {
  id: id(),
  name: text().notNull(),
  description: text(),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const productSizes = pgTable(
  'product_sizes',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    size: garmentSize().notNull(),
    defaultPrice: money().notNull().default('0'),
  },
  (t) => [uniqueIndex('product_sizes_uq').on(t.productId, t.size)],
);

/** Default workflow; copied into production_jobs when an order is confirmed. */
export const productStages = pgTable(
  'product_stages',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    stage: productionStage().notNull(),
    sequence: integer().notNull(),
  },
  (t) => [uniqueIndex('product_stages_uq').on(t.productId, t.stage)],
);

export const productRecipes = pgTable(
  'product_recipes',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    size: garmentSize().notNull(),
  },
  (t) => [uniqueIndex('product_recipes_uq').on(t.productId, t.size)],
);

export const recipeMaterials = pgTable(
  'recipe_materials',
  {
    id: id(),
    recipeId: uuid()
      .notNull()
      .references(() => productRecipes.id, { onDelete: 'cascade' }),
    materialId: uuid()
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    quantityPerPiece: qty().notNull(), // Basketball jersey M: 1.500 yd Polydex
    stage: productionStage().notNull(), // decides when it is deducted
  },
  (t) => [uniqueIndex('recipe_materials_uq').on(t.recipeId, t.materialId)],
);

export const machines = pgTable('machines', {
  id: id(),
  name: text().notNull(),
  stage: productionStage().notNull(),
  powerKw: numeric({ precision: 8, scale: 3 }).notNull(),
  active: boolean().notNull().default(true),
});

export const productSizeProcesses = pgTable(
  'product_size_processes',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    size: garmentSize().notNull(),
    machineId: uuid()
      .notNull()
      .references(() => machines.id, { onDelete: 'restrict' }),
    minutesPerPiece: numeric({ precision: 8, scale: 2 }).notNull(),
  },
  (t) => [uniqueIndex('product_size_processes_uq').on(t.productId, t.size, t.machineId)],
);

export const electricityRates = pgTable('electricity_rates', {
  id: id(),
  ratePerKwh: unitCost().notNull(),
  effectiveDate: date().notNull().unique(),
});
