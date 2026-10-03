'use client';

import type { DesignApprovalStatus } from '@yamban/shared';
import { JobCard } from './job-card';

interface DesignJobRow {
  id: string;
  productionJobId: string;
  approvalStatus: DesignApprovalStatus;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  productId: string;
  productName: string;
  quantity: number;
  dueDate: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
}

interface DesignBoardData {
  DRAFTING: DesignJobRow[];
  FOR_APPROVAL: DesignJobRow[];
  REVISION_REQUESTED: DesignJobRow[];
  APPROVED: DesignJobRow[];
}

interface DesignBoardProps {
  board: DesignBoardData;
  labels: Record<DesignApprovalStatus, string>;
}

const COLUMNS: DesignApprovalStatus[] = ['DRAFTING', 'FOR_APPROVAL', 'REVISION_REQUESTED', 'APPROVED'];

export function DesignBoard({ board, labels }: DesignBoardProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {COLUMNS.map((status) => (
        <div key={status} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">{labels[status]}</h2>
            <span className="text-sm text-muted-foreground">{board[status].length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {board[status].map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {board[status].length === 0 && (
              <div className="rounded-surface border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No jobs
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
