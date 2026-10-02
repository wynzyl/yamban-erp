import { z } from 'zod';
import { GARMENT_SIZES } from '../enums.js';
import { money, optionalText } from './_helpers.js';

// ─────────────────────────────────────────────────────────────────────────────
// Product Size (size with default price)
// ─────────────────────────────────────────────────────────────────────────────

export const productSizeSchema = z.object({
  size: z.enum(GARMENT_SIZES, { message: 'Select a size.' }),
  defaultPrice: money,
});
export type ProductSizeInput = z.input<typeof productSizeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Create Product
// ─────────────────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Enter a product name.').max(200),
  description: optionalText(1000),
  sizes: z.array(productSizeSchema).optional().default([]),
});
export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductData = z.output<typeof createProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Update Product
// ─────────────────────────────────────────────────────────────────────────────

export const updateProductSchema = z.object({
  name: z.string().trim().min(1, 'Enter a product name.').max(200).optional(),
  description: optionalText(1000),
  sizes: z.array(productSizeSchema).optional(),
});
export type UpdateProductData = z.output<typeof updateProductSchema>;
