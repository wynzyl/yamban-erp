import { z } from 'zod';
import { normalizeMobile } from '../format.js';
import { optionalText } from './_helpers.js';

/** Names are stored as entered. Never title-case them (guideline: Formats). */
export const createCustomerSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter a first name.').max(100),
  lastName: z.string().trim().max(100).optional().transform((v) => v ?? ''),
  organizationId: z.uuid().optional().nullable(),
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
  facebook: optionalText(),
  birthday: z.iso.date('Use a date like 2026-03-07.').optional().nullable(),
  streetPurok: optionalText(),
  barangay: optionalText(120),
  municipality: optionalText(120),
  province: optionalText(120),
  notes: optionalText(2000),
});
export type CreateCustomerInput = z.input<typeof createCustomerSchema>;
export type CreateCustomerData = z.output<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerData = z.output<typeof updateCustomerSchema>;

export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListQuery = z.output<typeof listQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
