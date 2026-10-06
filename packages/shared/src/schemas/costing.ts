import { z } from 'zod';
import { ORDER_STATUSES, PRODUCTION_STAGES } from '../enums.js';

export const listCostingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  search: z.string().trim().max(100).optional(),
});
export type ListCostingQuery = z.output<typeof listCostingQuerySchema>;

export const updateDefaultLaborRatesSchema = z.object({
  rates: z.array(
    z.object({
      stage: z.enum(PRODUCTION_STAGES),
      ratePerPiece: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid money amount'),
    }),
  ).min(1),
});
export type UpdateDefaultLaborRatesData = z.infer<typeof updateDefaultLaborRatesSchema>;

export const productionCostReportQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be YYYY-MM format'),
});
export type ProductionCostReportQuery = z.infer<typeof productionCostReportQuerySchema>;
