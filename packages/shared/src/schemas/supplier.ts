import { z } from 'zod';
import { normalizeMobile } from '../format.js';
import { optionalText } from './_helpers.js';

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Enter a supplier name.').max(200),
  contactPerson: optionalText(100),
  mobile: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = normalizeMobile(v);
      if (!n) {
        ctx.addIssue({ code: 'custom', message: 'Use a PH mobile number, like 0917 123 4567.' });
        return z.NEVER;
      }
      return n;
    }),
  email: z
    .union([z.email('Enter a valid email address.'), z.literal('')])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  address: optionalText(500),
  bankDetails: optionalText(500),
  notes: optionalText(2000),
});
export type CreateSupplierInput = z.input<typeof createSupplierSchema>;
export type CreateSupplierData = z.output<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierData = z.output<typeof updateSupplierSchema>;
