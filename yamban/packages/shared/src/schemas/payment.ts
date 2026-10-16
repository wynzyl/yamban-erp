import { z } from 'zod';
import { PAYMENT_METHODS } from '../enums.js';
import { optionalText, positiveMoney } from './_helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Record Payment
// ─────────────────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  orderId: z.uuid('Select an order.'),
  paymentDate: z.string().min(1, 'Enter a payment date.'),
  amount: positiveMoney,
  method: z.enum(PAYMENT_METHODS, { message: 'Select a payment method.' }),
  reference: optionalText(100),
  notes: optionalText(500),
});
export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
export type CreatePaymentData = z.output<typeof createPaymentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Payment (corrections)
// ─────────────────────────────────────────────────────────────────────────────

export const updatePaymentSchema = z.object({
  paymentDate: z.string().optional(),
  amount: positiveMoney.optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  reference: optionalText(100),
  notes: optionalText(500),
});
export type UpdatePaymentData = z.output<typeof updatePaymentSchema>;
