import { z } from 'zod';
import { PRODUCTION_STAGES } from '../enums.js';

/** Quantity per piece (up to 14,3 precision). */
const quantityPerPiece = z
  .string()
  .regex(/^\d{1,11}(\.\d{1,3})?$/, 'Enter a valid quantity.')
  .refine((v) => parseFloat(v) > 0, 'Quantity must be greater than zero.');

const stageSchema = z.enum(PRODUCTION_STAGES, { message: 'Select a production stage.' });

export const addRecipeMaterialSchema = z.object({
  materialId: z.uuid('Select a material.'),
  quantityPerPiece,
  stage: stageSchema,
});
export type AddRecipeMaterialInput = z.input<typeof addRecipeMaterialSchema>;
export type AddRecipeMaterialData = z.output<typeof addRecipeMaterialSchema>;

export const updateRecipeMaterialSchema = z.object({
  quantityPerPiece,
  stage: stageSchema,
});
export type UpdateRecipeMaterialInput = z.input<typeof updateRecipeMaterialSchema>;
export type UpdateRecipeMaterialData = z.output<typeof updateRecipeMaterialSchema>;
