import { z } from 'zod';
import { STOCK_UNITS } from '../enums.js';
import { optionalText } from './_helpers.js';

/** Positive decimal for quantities (up to 14,3 precision). */
const qty = z
  .string()
  .regex(/^\d{1,11}(\.\d{1,3})?$/, 'Enter a valid quantity.')
  .refine((v) => parseFloat(v) >= 0, 'Quantity cannot be negative.');

/** Unit cost (up to 14,4 precision). */
const unitCost = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,4})?$/, 'Enter a valid unit cost.')
  .refine((v) => parseFloat(v) >= 0, 'Unit cost cannot be negative.');

export const createMaterialSchema = z.object({
  name: z.string().trim().min(1, 'Enter a material name.').max(200),
  color: optionalText(50),
  category: z.string().trim().min(1, 'Select a category.').max(50),
  unit: z.enum(STOCK_UNITS, { message: 'Select a stock unit.' }),
  purchaseUnit: z.string().trim().min(1, 'Enter a purchase unit.').max(50),
  purchaseQuantity: qty,
  defaultSupplierId: z.uuid().optional().nullable(),
  reorderLevel: qty.optional().default('0'),
  unitCost: unitCost.optional().default('0'),
});
export type CreateMaterialInput = z.input<typeof createMaterialSchema>;
export type CreateMaterialData = z.output<typeof createMaterialSchema>;

export const updateMaterialSchema = createMaterialSchema.partial();
export type UpdateMaterialData = z.output<typeof updateMaterialSchema>;

export const MATERIAL_CATEGORIES = [
  'FABRIC',
  'INK',
  'PAPER',
  'THREAD',
  'TRIM',
  'PACKAGING',
] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  FABRIC: 'Fabric',
  INK: 'Ink',
  PAPER: 'Paper',
  THREAD: 'Thread',
  TRIM: 'Trim',
  PACKAGING: 'Packaging',
};
