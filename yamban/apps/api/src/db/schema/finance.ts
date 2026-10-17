import { sql } from 'drizzle-orm';
import { check, date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { createdAt, id, money, updatedAt } from './_columns.js';
import { expenseCategory, paymentMethod } from './enums.js';
import { suppliers } from './master.js';
import { orders } from './sales.js';

/**
 * Operating expenses. `category` is NOT NULL on purpose: the 2026 books lost
 * ₱57,659.00 of February expenses to a blank category (guideline: "No uncategorised money").
 * Employee cash advances (bale) are not expenses and do not belong here.
 */
export const expenses = pgTable(
  'expenses',
  {
    id: id(),
    expenseDate: date().notNull(),
    category: expenseCategory().notNull(),
    supplierId: uuid().references(() => suppliers.id, { onDelete: 'set null' }),
    amount: money().notNull(),
    paymentMethod: paymentMethod().notNull(),
    description: text().notNull(),
    orderId: uuid().references(() => orders.id, { onDelete: 'set null' }),
    createdById: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('expenses_month_idx').on(t.expenseDate, t.category),
    check('expenses_amount_pos', sql`${t.amount} > 0`),
  ],
);

/**
 * Single row table for monthly overhead (rent, utilities, etc.) used in
 * profit margin calculations. Overhead is allocated equally across all
 * orders confirmed in a month.
 */
export const overheadSettings = pgTable(
  'overhead_settings',
  {
    id: id(),
    monthlyAmount: money().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [check('overhead_settings_amount_nonneg', sql`${t.monthlyAmount} >= 0`)],
);
