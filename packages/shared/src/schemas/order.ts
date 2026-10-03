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
// Edit Order Items (for full order editing before PRINTING)
// ─────────────────────────────────────────────────────────────────────────────

export const editOrderItemSchema = z.object({
  id: z.uuid().optional(), // existing item ID (undefined = new item)
  productId: z.uuid('Select a product.'),
  description: optionalText(500),
  sizes: z.array(orderItemSizeSchema).min(1, 'Add at least one size.'),
  roster: z.array(rosterEntrySchema).optional().default([]),
});
export type EditOrderItemInput = z.input<typeof editOrderItemSchema>;

export const editOrderSchema = z.object({
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  discount: money.optional().default('0'),
  notes: optionalText(2000),
  items: z.array(editOrderItemSchema).min(1, 'Add at least one item.'),
});
export type EditOrderInput = z.input<typeof editOrderSchema>;
export type EditOrderData = z.output<typeof editOrderSchema>;

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

// ─────────────────────────────────────────────────────────────────────────────
// Edit Permissions (graduated permissions for post-confirmation editing)
// ─────────────────────────────────────────────────────────────────────────────

export interface EditPermissions {
  canFullEdit: boolean;
  canEditRoster: boolean;
  canAddItems: boolean;
  canEditPrices: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Roster (edit roster for a specific item)
// ─────────────────────────────────────────────────────────────────────────────

export const updateRosterSchema = z.object({
  roster: z.array(rosterEntrySchema),
});
export type UpdateRosterInput = z.input<typeof updateRosterSchema>;
export type UpdateRosterData = z.output<typeof updateRosterSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Add Order Item (add item to confirmed order)
// ─────────────────────────────────────────────────────────────────────────────

export const addOrderItemSchema = z.object({
  productId: z.uuid('Select a product.'),
  description: optionalText(500),
  sizes: z.array(orderItemSizeSchema).min(1, 'Add at least one size.'),
  roster: z.array(rosterEntrySchema).optional().default([]),
});
export type AddOrderItemInput = z.input<typeof addOrderItemSchema>;
export type AddOrderItemData = z.output<typeof addOrderItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Item Sizes (change description, quantities and prices for a specific item)
// ─────────────────────────────────────────────────────────────────────────────

export const updateItemSizesSchema = z.object({
  description: optionalText(500),
  sizes: z.array(
    z.object({
      size: z.enum(GARMENT_SIZES, { message: 'Select a size.' }),
      quantity: positiveInt,
      unitPrice: money,
    }),
  ).min(1, 'Provide at least one size.'),
});
export type UpdateItemSizesInput = z.input<typeof updateItemSizesSchema>;
export type UpdateItemSizesData = z.output<typeof updateItemSizesSchema>;

// Keep old schema for backwards compatibility
export const updateItemPricesSchema = updateItemSizesSchema;
export type UpdateItemPricesInput = UpdateItemSizesInput;
export type UpdateItemPricesData = UpdateItemSizesData;

// ─────────────────────────────────────────────────────────────────────────────
// Update Order Notes
// ─────────────────────────────────────────────────────────────────────────────

export const updateOrderNotesSchema = z.object({
  notes: optionalText(2000),
});
export type UpdateOrderNotesInput = z.input<typeof updateOrderNotesSchema>;
export type UpdateOrderNotesData = z.output<typeof updateOrderNotesSchema>;
