import { z } from 'zod';
import { money } from './_helpers.js';

/** Unit cost for electricity (up to 14,4 precision). */
const ratePerKwh = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,4})?$/, 'Enter a valid rate.')
  .refine((v) => parseFloat(v) > 0, 'Rate must be greater than zero.');

export const setElectricityRateSchema = z.object({
  ratePerKwh,
  effectiveDate: z.string().date('Enter a valid date.'),
});
export type SetElectricityRateInput = z.input<typeof setElectricityRateSchema>;
export type SetElectricityRateData = z.output<typeof setElectricityRateSchema>;

/** Schema for updating the monthly overhead setting. */
export const updateOverheadSchema = z.object({
  monthlyAmount: money,
});
export type UpdateOverheadInput = z.input<typeof updateOverheadSchema>;
export type UpdateOverheadData = z.output<typeof updateOverheadSchema>;

/** Response shape for overhead settings. */
export interface OverheadSettingsResponse {
  monthlyAmount: string;
  updatedAt: string;
}
