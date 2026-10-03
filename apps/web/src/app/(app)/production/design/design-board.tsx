'use client';

import type { JobStatus } from '@yamban/shared';
import { JobCard } from './job-card';

interface DesignJobRow {
  id: string;
  productionJobId: string;
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
  hasFile: boolean;
  isReady: boolean;
  productionStatus: JobStatus;
}

interface DesignBoardData {
  pending: DesignJobRow[];
  ready: DesignJobRow[];
}

interface DesignBoardProps {
  board: DesignBoardData;
}

const COLUMNS: { key: keyof DesignBoardData; label: string }[] = [
  { key: 'pending', label: 'Needs design' },
  { key: 'ready', label: 'Ready for print' },
];

export function DesignBoard({ board }: DesignBoardProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {COLUMNS.map(({ key, label }) => (
        <div key={key} className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">{label}</h2>
            <span className="text-sm text-muted-foreground">{board[key].length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {board[key].map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
            {board[key].length === 0 && (
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
