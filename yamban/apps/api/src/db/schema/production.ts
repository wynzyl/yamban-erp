import { type AnyPgColumn, boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { createdAt, id, qty } from './_columns.js';
import { designApprovalStatus, jobStatus, productionStage } from './enums.js';
import { orderItems, orders } from './sales.js';

/** Per order item. `status` is the single source of truth for where an item is (spec §5). */
export const productionJobs = pgTable(
  'production_jobs',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    orderItemId: uuid()
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    stage: productionStage().notNull(),
    sequence: integer().notNull(),
    status: jobStatus().notNull().default('PENDING'),
    plannedQuantity: integer().notNull(),
    completedQuantity: integer().notNull().default(0),
    assignedToId: uuid().references(() => users.id, { onDelete: 'set null' }),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    actualFabricUsed: qty(), // HEAT_PRESS only; variance becomes ADJUSTMENT/RETURN
    notes: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('production_jobs_item_stage_uq').on(t.orderItemId, t.stage),
    index('production_jobs_board_idx').on(t.stage, t.status),
  ],
);

/** Extends the DESIGN job one-to-one; does not repeat its status, assignee or dates. */
export const designJobs = pgTable('design_jobs', {
  id: id(),
  productionJobId: uuid()
    .notNull()
    .unique()
    .references(() => productionJobs.id, { onDelete: 'cascade' }),
  approvalStatus: designApprovalStatus().notNull().default('DRAFTING'),
  revisionCount: integer().notNull().default(0),
  requirements: text(),
  referenceNotes: text(),
  customerApprovedAt: timestamp({ withTimezone: true }),
  approvedById: uuid().references(() => users.id, { onDelete: 'set null' }),
  reusedFromDesignJobId: uuid().references((): AnyPgColumn => designJobs.id, { onDelete: 'set null' }),
});

export const designFiles = pgTable(
  'design_files',
  {
    id: id(),
    designJobId: uuid()
      .notNull()
      .references(() => designJobs.id, { onDelete: 'cascade' }),
    fileName: text().notNull(),
    storageKey: text().notNull(),
    fileType: text().notNull(),
    version: integer().notNull(),
    isFinal: boolean().notNull().default(false),
    uploadedAt: createdAt(),
  },
  (t) => [uniqueIndex('design_files_version_uq').on(t.designJobId, t.version)],
);
