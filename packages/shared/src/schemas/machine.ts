import { z } from 'zod';
import { PRODUCTION_STAGES } from '../enums.js';

/** Power in kW (up to 8,3 precision). */
const powerKw = z
  .string()
  .regex(/^\d{1,5}(\.\d{1,3})?$/, 'Enter a valid power value.')
  .refine((v) => parseFloat(v) > 0, 'Power must be greater than zero.');

export const createMachineSchema = z.object({
  name: z.string().trim().min(1, 'Enter a machine name.').max(100),
  stage: z.enum(PRODUCTION_STAGES, { message: 'Select a production stage.' }),
  powerKw,
});
export type CreateMachineInput = z.input<typeof createMachineSchema>;
export type CreateMachineData = z.output<typeof createMachineSchema>;

export const updateMachineSchema = createMachineSchema.partial();
export type UpdateMachineInput = z.input<typeof updateMachineSchema>;
export type UpdateMachineData = z.output<typeof updateMachineSchema>;
