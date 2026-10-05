import { z } from 'zod';
import { GARMENT_SIZES } from '../enums.js';

/** Minutes per piece (up to 8,2 precision). */
const minutesPerPiece = z
  .string()
  .regex(/^\d{1,6}(\.\d{1,2})?$/, 'Enter a valid time.')
  .refine((v) => parseFloat(v) > 0, 'Time must be greater than zero.');

export const addProductProcessSchema = z.object({
  size: z.enum(GARMENT_SIZES, { message: 'Select a size.' }),
  machineId: z.uuid('Select a machine.'),
  minutesPerPiece,
});
export type AddProductProcessInput = z.input<typeof addProductProcessSchema>;
export type AddProductProcessData = z.output<typeof addProductProcessSchema>;

export const updateProductProcessSchema = z.object({
  minutesPerPiece,
});
export type UpdateProductProcessInput = z.input<typeof updateProductProcessSchema>;
export type UpdateProductProcessData = z.output<typeof updateProductProcessSchema>;
