import { z } from 'zod';

/** Schema for starting a job, with optional payment acknowledgement for printing */
export const startJobSchema = z.object({
  acknowledgeNoPayment: z.boolean().optional(),
});
export type StartJobData = z.output<typeof startJobSchema>;
