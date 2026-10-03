import { z } from 'zod';
import { DESIGN_APPROVAL_STATUSES, type DesignApprovalStatus } from '../enums.js';
import { optionalText } from './_helpers.js';

export const updateDesignJobSchema = z.object({
  approvalStatus: z.enum(DESIGN_APPROVAL_STATUSES).optional(),
  requirements: optionalText(2000),
  referenceNotes: optionalText(2000),
});
export type UpdateDesignJobData = z.output<typeof updateDesignJobSchema>;

export const assignDesignJobSchema = z.object({
  assignedToId: z.string().uuid().nullable(),
});
export type AssignDesignJobData = z.output<typeof assignDesignJobSchema>;

export const DESIGN_APPROVAL_STATUS_LABELS: Record<DesignApprovalStatus, string> = {
  DRAFTING: 'Drafting',
  FOR_APPROVAL: 'For approval',
  REVISION_REQUESTED: 'Revision requested',
  APPROVED: 'Approved',
};
