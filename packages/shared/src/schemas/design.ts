import { z } from 'zod';
import { optionalText } from './_helpers.js';

/** Update design job notes (requirements, referenceNotes) */
export const updateDesignJobSchema = z.object({
  requirements: optionalText(2000),
  referenceNotes: optionalText(2000),
});
export type UpdateDesignJobData = z.output<typeof updateDesignJobSchema>;

export const assignDesignJobSchema = z.object({
  assignedToId: z.string().uuid().nullable(),
});
export type AssignDesignJobData = z.output<typeof assignDesignJobSchema>;
