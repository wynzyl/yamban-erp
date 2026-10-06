import { z } from 'zod';
import { money, optionalMoney, optionalText } from './_helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Create Product
// ─────────────────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Enter a product name.').max(200),
  description: optionalText(1000),
  defaultPrice: money,
});
export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductData = z.output<typeof createProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Product
// ─────────────────────────────────────────────────────────────────────────────

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Enter a product name.').max(200).optional(),
  description: optionalText(1000),
  defaultPrice: money.optional(),
});
export type UpdateProductData = z.output<typeof updateProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Product Stage Labor Rate
// ─────────────────────────────────────────────────────────────────────────────

export const updateProductStageLaborRateSchema = z.object({
  laborRatePerPiece: optionalMoney,
});
export type UpdateProductStageLaborRateData = z.output<typeof updateProductStageLaborRateSchema>;
