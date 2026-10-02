import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { createdAt, id, money, qty, unitCost, updatedAt } from './_columns.js';
import { garmentSize, materialStatus, orderStatus, paymentMethod, productionStage, stockUnit } from './enums.js';
import { customers, machines, materials, organizations, products } from './master.js';

/** The order is the central operational record (spec §1). */
export const orders = pgTable(
  'orders',
  {
    id: id(),
    orderNumber: text().notNull(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    organizationId: uuid().references(() => organizations.id, { onDelete: 'set null' }),
    parentOrderId: uuid().references((): AnyPgColumn => orders.id, { onDelete: 'restrict' }),
    orderDate: date().notNull().defaultNow(),
    dueDate: date(),
    status: orderStatus().notNull().default('QUOTATION'),
    materialStatus: materialStatus().notNull().default('COMPLETE'),
    subtotal: money().notNull().default('0'),
    discount: money().notNull().default('0'),
    total: money().notNull().default('0'),
    /** Rate in force when confirmed; past orders keep it (spec §29). */
    electricityRatePerKwh: unitCost(),
    confirmedAt: timestamp({ withTimezone: true }),
    notes: text(),
    createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('orders_number_uq').on(t.orderNumber),
    index('orders_customer_idx').on(t.customerId),
    index('orders_status_due_idx').on(t.status, t.dueDate),
    check('orders_discount_nonneg', sql`${t.discount} >= 0`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    description: text(),
    quantity: integer().notNull().default(0), // derived: SUM(order_item_sizes.quantity)
    subtotal: money().notNull().default('0'), // derived: SUM(order_item_sizes.subtotal)
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);

/** Prices live only here: sizes can be priced differently (2XL+). */
export const orderItemSizes = pgTable(
  'order_item_sizes',
  {
    id: id(),
    orderItemId: uuid()
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    size: garmentSize().notNull(),
    quantity: integer().notNull(),
    unitPrice: money().notNull(),
    subtotal: money().notNull(),
  },
  (t) => [
    uniqueIndex('order_item_sizes_uq').on(t.orderItemId, t.size),
    check('order_item_sizes_qty_pos', sql`${t.quantity} > 0`),
  ],
);

export const orderRoster = pgTable(
  'order_roster',
  {
    id: id(),
    orderItemId: uuid()
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    playerName: text().notNull(),
    jerseyNumber: text(), // text: "00" and "7" are different jerseys
    size: garmentSize().notNull(),
  },
  (t) => [index('order_roster_item_idx').on(t.orderItemId)],
);

/**
 * Snapshot of the recipe at order time. Unconsumed lines of CONFIRMED /
 * IN_PRODUCTION orders are the reservations (spec §24).
 */
export const orderMaterials = pgTable(
  'order_materials',
  {
    id: id(),
    orderItemId: uuid()
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    materialId: uuid()
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    size: garmentSize().notNull(),
    quantityPerPiece: qty().notNull(),
    totalQuantity: qty().notNull(),
    unit: stockUnit().notNull(),
    unitCost: unitCost().notNull(),
    totalCost: money().notNull(),
    stage: productionStage().notNull(),
    consumedAt: timestamp({ withTimezone: true }), // guards against double deduction
  },
  (t) => [
    index('order_materials_item_idx').on(t.orderItemId),
    // Fast "reserved" sums: unconsumed lines per material.
    index('order_materials_open_idx').on(t.materialId).where(sql`${t.consumedAt} is null`),
  ],
);

/** Machine minutes copied from product_size_processes at confirmation (spec §29). */
export const orderItemProcesses = pgTable(
  'order_item_processes',
  {
    id: id(),
    orderItemId: uuid()
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    size: garmentSize().notNull(),
    machineId: uuid()
      .notNull()
      .references(() => machines.id, { onDelete: 'restrict' }),
    powerKw: numeric({ precision: 8, scale: 3 }).notNull(),
    minutesPerPiece: numeric({ precision: 8, scale: 2 }).notNull(),
    quantity: integer().notNull(),
  },
  (t) => [index('order_item_processes_item_idx').on(t.orderItemId)],
);

export const payments = pgTable(
  'payments',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    paymentDate: date().notNull().defaultNow(),
    amount: money().notNull(),
    method: paymentMethod().notNull(),
    reference: text(), // GCash ref no., cheque no.
    notes: text(),
    recordedById: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [index('payments_order_idx').on(t.orderId), check('payments_amount_pos', sql`${t.amount} > 0`)],
);
