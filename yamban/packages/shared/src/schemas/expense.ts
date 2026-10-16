import { z } from 'zod';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../enums.js';
import { optionalText, positiveMoney } from './_helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// List Query (month filter, category filter, search, pagination)
// ─────────────────────────────────────────────────────────────────────────────

export const listExpenseQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM format.')
    .optional(),
  categories: z
    .preprocess(
      (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
      z.array(z.enum(EXPENSE_CATEGORIES)),
    )
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});
export type ListExpenseQuery = z.output<typeof listExpenseQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Create Expense
// ─────────────────────────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  expenseDate: z.string().min(1, 'Enter an expense date.'),
  category: z.enum(EXPENSE_CATEGORIES, { message: 'Select a category.' }),
  amount: positiveMoney,
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Select a payment method.' }),
  description: z.string().min(1, 'Enter a description.').max(500),
  supplierId: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.uuid().optional(),
  ),
  orderId: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.uuid().optional(),
  ),
});
export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type CreateExpenseData = z.output<typeof createExpenseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Expense (partial)
// ─────────────────────────────────────────────────────────────────────────────

export const updateExpenseSchema = z.object({
  expenseDate: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  amount: positiveMoney.optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  description: z.string().max(500).optional(),
  supplierId: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.uuid().optional().nullable(),
  ),
  orderId: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.uuid().optional().nullable(),
  ),
});
export type UpdateExpenseData = z.output<typeof updateExpenseSchema>;
