import { z } from 'zod';
import { GARMENT_SIZES, ORDER_STATUSES } from '../enums.js';
import { money, optionalText, positiveInt } from './_helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Order Item Size (the actual priced line)
// ─────────────────────────────────────────────────────────────────────────────

export const orderItemSizeSchema = z.object({
  size: z.enum(GARMENT_SIZES, { message: 'Select a size.' }),
  quantity: positiveInt,
  unitPrice: money,
});
export type OrderItemSizeInput = z.input<typeof orderItemSizeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Order Roster Entry
// ─────────────────────────────────────────────────────────────────────────────

export const rosterEntrySchema = z.object({
  playerName: z.string().trim().min(1, 'Enter a name.').max(100),
  jerseyNumber: optionalText(10),
  size: z.enum(GARMENT_SIZES, { message: 'Select a size.' }),
});
export type RosterEntryInput = z.input<typeof rosterEntrySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Order Item (a product line)
// ─────────────────────────────────────────────────────────────────────────────

export const orderItemSchema = z.object({
  productId: z.uuid('Select a product.'),
  description: optionalText(500),
  sizes: z.array(orderItemSizeSchema).min(1, 'Add at least one size.'),
  roster: z.array(rosterEntrySchema).optional().default([]),
});
export type OrderItemInput = z.input<typeof orderItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Create Order
// ─────────────────────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  customerId: z.uuid('Select a customer.'),
  organizationId: z.uuid().optional().nullable(),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  discount: money.optional().default('0'),
  notes: optionalText(2000),
  items: z.array(orderItemSchema).min(1, 'Add at least one item.'),
});
export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderData = z.output<typeof createOrderSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Order (status changes, notes, due date)
// ─────────────────────────────────────────────────────────────────────────────

export const updateOrderSchema = z.object({
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  discount: money.optional(),
  notes: optionalText(2000),
  status: z.enum(ORDER_STATUSES).optional(),
});
export type UpdateOrderData = z.output<typeof updateOrderSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Order (transitions QUOTATION → CONFIRMED)
// ─────────────────────────────────────────────────────────────────────────────

export const confirmOrderSchema = z.object({
  orderId: z.uuid(),
});
export type ConfirmOrderData = z.output<typeof confirmOrderSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Order Status Labels
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<(typeof ORDER_STATUSES)[number], string> = {
  QUOTATION: 'Quotation',
  CONFIRMED: 'Confirmed',
  IN_PRODUCTION: 'In production',
  READY: 'Ready',
  RELEASED: 'Released',
  CANCELLED: 'Cancelled',
};
