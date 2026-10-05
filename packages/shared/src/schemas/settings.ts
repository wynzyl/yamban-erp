import { z } from 'zod';

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
