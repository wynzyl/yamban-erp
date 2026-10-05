import { z } from 'zod';
import { ORDER_STATUSES } from '../enums.js';

export const listCostingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  search: z.string().trim().max(100).optional(),
});
export type ListCostingQuery = z.output<typeof listCostingQuerySchema>;
