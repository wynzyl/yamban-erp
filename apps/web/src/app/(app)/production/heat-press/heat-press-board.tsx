'use client';

import type { JobStatus } from '@yamban/shared';
import { JobCard } from './job-card';

interface RosterEntry {
  playerName: string;
  jerseyNumber: string | null;
  size: string;
}

interface DesignFileInfo {
  id: string;
  fileName: string;
  storageKey: string;
  isFinal: boolean;
}

interface StageJobRow {
  id: string;
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  status: JobStatus;
  dueDate: string | null;
  hasPaidDownPayment: boolean;
  sizes: { size: string; quantity: number }[];
  roster: RosterEntry[];
  designFile: DesignFileInfo | null;
}

interface HeatPressBoardProps {
  jobs: StageJobRow[];
}

export function HeatPressBoard({ jobs }: HeatPressBoardProps) {
  // Group jobs by status
  const pendingJobs = jobs.filter((j) => j.status === 'PENDING');
  const inProgressJobs = jobs.filter((j) => j.status === 'IN_PROGRESS');

  if (jobs.length === 0) {
    return (
      <div className="rounded-surface border border-dashed border-border p-8 text-center text-muted-foreground">
        No jobs in the heat press queue. Jobs appear here when printing is completed.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Pending */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Pending ({pendingJobs.length})
        </h2>
        <div className="flex flex-col gap-3">
          {pendingJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {pendingJobs.length === 0 && (
            <div className="rounded-surface border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No pending jobs
            </div>
          )}
        </div>
      </div>

      {/* In Progress */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          In progress ({inProgressJobs.length})
        </h2>
        <div className="flex flex-col gap-3">
          {inProgressJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
          {inProgressJobs.length === 0 && (
            <div className="rounded-surface border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No jobs in progress
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
