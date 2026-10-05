import { z } from 'zod';
import {
  INVENTORY_TXN_TYPES,
  PURCHASE_REQUEST_STATUSES,
  STOCK_UNITS,
} from '../enums.js';
import { money, optionalText } from './_helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Quantity helper (numeric(14,3) for stock quantities)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stock quantity string (up to 14,3 precision).
 * Matches the database numeric(14,3) columns.
 */
export const qty = z
  .string()
  .regex(/^\d{1,11}(\.\d{1,3})?$/, 'Enter a valid quantity.')
  .refine((v) => parseFloat(v) >= 0, 'Quantity cannot be negative.');

/**
 * Signed quantity (can be negative for deductions).
 */
export const signedQty = z
  .string()
  .regex(/^-?\d{1,11}(\.\d{1,3})?$/, 'Enter a valid quantity.');

/**
 * Unit cost string (up to 14,4 precision).
 */
export const unitCost = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,4})?$/, 'Enter a valid unit cost.')
  .refine((v) => parseFloat(v) >= 0, 'Unit cost cannot be negative.');

// ─────────────────────────────────────────────────────────────────────────────
// List Inventory Transactions Query
// ─────────────────────────────────────────────────────────────────────────────

export const listInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  materialId: z.uuid().optional(),
  type: z.enum(INVENTORY_TXN_TYPES).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  orderId: z.uuid().optional(),
  supplierId: z.uuid().optional(),
});
export type ListInventoryQuery = z.output<typeof listInventoryQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Record Adjustment (manual stock adjustment)
// ─────────────────────────────────────────────────────────────────────────────

export const recordAdjustmentSchema = z.object({
  materialId: z.uuid('Select a material.'),
  quantity: signedQty,
  unitCost: unitCost.optional(),
  reference: optionalText(500),
});
export type RecordAdjustmentInput = z.input<typeof recordAdjustmentSchema>;
export type RecordAdjustmentData = z.output<typeof recordAdjustmentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Record Waste
// ─────────────────────────────────────────────────────────────────────────────

export const recordWasteSchema = z.object({
  materialId: z.uuid('Select a material.'),
  quantity: qty.refine((v) => parseFloat(v) > 0, 'Quantity must be greater than zero.'),
  unitCost: unitCost.optional(),
  reference: optionalText(500),
  orderId: z.uuid().optional(),
});
export type RecordWasteInput = z.input<typeof recordWasteSchema>;
export type RecordWasteData = z.output<typeof recordWasteSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Process Return (cancellation returns)
// ─────────────────────────────────────────────────────────────────────────────

export const returnLineSchema = z.object({
  materialId: z.uuid('Select a material.'),
  returnQuantity: qty,
  wasteQuantity: qty,
  unitCost: unitCost,
});
export type ReturnLineInput = z.input<typeof returnLineSchema>;

export const processReturnSchema = z.object({
  orderId: z.uuid('Select an order.'),
  lines: z.array(returnLineSchema).min(1, 'Add at least one material to return.'),
  reference: optionalText(500),
});
export type ProcessReturnInput = z.input<typeof processReturnSchema>;
export type ProcessReturnData = z.output<typeof processReturnSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// List Purchase Requests Query
// ─────────────────────────────────────────────────────────────────────────────

export const listPurchaseRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(PURCHASE_REQUEST_STATUSES).optional(),
  supplierId: z.uuid().optional(),
  search: z.string().trim().max(100).optional(),
});
export type ListPurchaseRequestsQuery = z.output<typeof listPurchaseRequestsQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Purchase Request (edit PR lines)
// ─────────────────────────────────────────────────────────────────────────────

export const updatePurchaseRequestLineSchema = z.object({
  id: z.uuid(),
  purchaseQuantity: qty.refine((v) => parseFloat(v) > 0, 'Quantity must be greater than zero.'),
  estimatedUnitCost: unitCost,
});
export type UpdatePurchaseRequestLineInput = z.input<typeof updatePurchaseRequestLineSchema>;

export const updatePurchaseRequestSchema = z.object({
  neededBy: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  notes: optionalText(2000),
  lines: z.array(updatePurchaseRequestLineSchema).optional(),
});
export type UpdatePurchaseRequestInput = z.input<typeof updatePurchaseRequestSchema>;
export type UpdatePurchaseRequestData = z.output<typeof updatePurchaseRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Receive Purchase Request (receive delivery)
// ─────────────────────────────────────────────────────────────────────────────

export const receiveLineSchema = z.object({
  purchaseRequestLineId: z.uuid(),
  receivedQuantity: qty.refine((v) => parseFloat(v) > 0, 'Quantity must be greater than zero.'),
  actualUnitCost: unitCost,
});
export type ReceiveLineInput = z.input<typeof receiveLineSchema>;

export const receivePurchaseRequestSchema = z.object({
  lines: z.array(receiveLineSchema).min(1, 'Add at least one line to receive.'),
  reference: optionalText(500),
});
export type ReceivePurchaseRequestInput = z.input<typeof receivePurchaseRequestSchema>;
export type ReceivePurchaseRequestData = z.output<typeof receivePurchaseRequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PR Status Labels
// ─────────────────────────────────────────────────────────────────────────────

export const PURCHASE_REQUEST_STATUS_LABELS: Record<
  (typeof PURCHASE_REQUEST_STATUSES)[number],
  string
> = {
  DRAFT: 'Draft',
  PRINTED: 'Printed',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Transaction Type Labels
// ─────────────────────────────────────────────────────────────────────────────

export const INVENTORY_TXN_TYPE_LABELS: Record<
  (typeof INVENTORY_TXN_TYPES)[number],
  string
> = {
  PURCHASE: 'Purchase',
  ORDER_CONSUMPTION: 'Consumption',
  RETURN: 'Return',
  ADJUSTMENT: 'Adjustment',
  WASTE: 'Waste',
};

// ─────────────────────────────────────────────────────────────────────────────
// Stock Unit Labels (already in enums but adding here for convenience)
// ─────────────────────────────────────────────────────────────────────────────

export const STOCK_UNIT_LABELS: Record<(typeof STOCK_UNITS)[number], string> = {
  YARD: 'Yard',
  METER: 'Meter',
  ML: 'Milliliter',
  GRAM: 'Gram',
  PIECE: 'Piece',
};
