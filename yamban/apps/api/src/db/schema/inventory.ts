import { sql } from 'drizzle-orm';
import { date, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { createdAt, id, money, qty, unitCost } from './_columns.js';
import { inventoryTxnType, purchaseRequestStatus } from './enums.js';
import { materials, suppliers } from './master.js';
import { orders } from './sales.js';

export const purchaseRequests = pgTable(
  'purchase_requests',
  {
    id: id(),
    prNumber: text().notNull(), // PR-2026-0001
    supplierId: uuid().references(() => suppliers.id, { onDelete: 'set null' }),
    status: purchaseRequestStatus().notNull().default('DRAFT'),
    neededBy: date(),
    notes: text(),
    receivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('purchase_requests_number_uq').on(t.prNumber),
    // "One open PR per supplier": at most one DRAFT per supplier.
    uniqueIndex('purchase_requests_one_draft_uq')
      .on(t.supplierId)
      .where(sql`${t.status} = 'DRAFT'`),
  ],
);

export const purchaseRequestLines = pgTable(
  'purchase_request_lines',
  {
    id: id(),
    purchaseRequestId: uuid()
      .notNull()
      .references(() => purchaseRequests.id, { onDelete: 'cascade' }),
    materialId: uuid()
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    shortageQuantity: qty().notNull(), // in stock unit, e.g. 15.000 yd
    purchaseQuantity: qty().notNull(), // rounded up to whole purchase units, e.g. 78.000 yd
    estimatedUnitCost: unitCost().notNull(),
    estimatedTotal: money().notNull(),
  },
  (t) => [uniqueIndex('purchase_request_lines_uq').on(t.purchaseRequestId, t.materialId)],
);

export const purchaseRequestLineOrders = pgTable(
  'purchase_request_line_orders',
  {
    purchaseRequestLineId: uuid()
      .notNull()
      .references(() => purchaseRequestLines.id, { onDelete: 'cascade' }),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    quantity: qty().notNull(),
  },
  (t) => [primaryKey({ columns: [t.purchaseRequestLineId, t.orderId] })],
);

/** The stock ledger. Never update stock directly; append here (spec §22). */
export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: id(),
    materialId: uuid()
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    type: inventoryTxnType().notNull(),
    quantity: qty().notNull(), // signed: + adds stock, − removes
    unitCost: unitCost().notNull(),
    supplierId: uuid().references(() => suppliers.id, { onDelete: 'set null' }),
    orderId: uuid().references(() => orders.id, { onDelete: 'set null' }),
    purchaseRequestId: uuid().references(() => purchaseRequests.id, { onDelete: 'set null' }),
    reference: text(),
    transactionDate: date().notNull().defaultNow(),
    createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('inventory_txn_material_idx').on(t.materialId, t.transactionDate),
    index('inventory_txn_order_idx').on(t.orderId),
  ],
);
