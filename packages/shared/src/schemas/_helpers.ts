import { z } from 'zod';

/**
 * Optional text field that:
 * - Accepts string, null, undefined, or empty string as input
 * - Trims whitespace
 * - Enforces max length
 * - Outputs string | null (empty/missing → null)
 *
 * Use this for all optional text fields to ensure consistent null handling
 * across client-side and server-side validation.
 */
export const optionalText = (max = 500) =>
  z.preprocess(
    (v) => (v === null || v === '' ? undefined : v),
    z.string().trim().max(max).optional(),
  ).transform((v) => v || null);

/**
 * Positive money string (up to 14,2 precision).
 * Matches the database numeric(14,2) columns.
 */
export const money = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter a valid amount.')
  .refine((v) => parseFloat(v) >= 0, 'Amount cannot be negative.');

/**
 * Positive money string that must be greater than zero.
 * Use for payments, prices, etc.
 */
export const positiveMoney = z
  .string()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter a valid amount.')
  .refine((v) => parseFloat(v) > 0, 'Amount must be greater than zero.');

/**
 * Positive integer for quantities.
 */
export const positiveInt = z.coerce.number().int().min(1, 'Quantity must be at least 1.');

/**
 * Optional money string (up to 14,2 precision).
 * Accepts null, undefined, empty string → outputs null.
 */
export const optionalMoney = z.preprocess(
  (v) => (v === null || v === '' || v === undefined ? undefined : v),
  z
    .string()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, 'Enter a valid amount.')
    .refine((v) => parseFloat(v) >= 0, 'Amount cannot be negative.')
    .optional(),
).transform((v) => v || null);
