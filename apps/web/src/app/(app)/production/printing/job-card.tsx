'use client';

import { formatDate, type JobStatus } from '@yamban/shared';
import { AlertTriangle, Calendar, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StartJobDialog } from './start-job-dialog';
import { CompleteJobButton } from './complete-job-button';

interface RosterEntry {
  playerName: string;
  jerseyNumber: string | null;
  size: string;
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
}

interface JobCardProps {
  job: StageJobRow;
}

export function JobCard({ job }: JobCardProps) {
  const isPending = job.status === 'PENDING';
  const isInProgress = job.status === 'IN_PROGRESS';

  return (
    <div className="rounded-surface border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/orders/${job.orderId}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {job.orderNumber}
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {job.customerName}
          </p>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">{job.quantity} pcs</span>
      </div>

      <p className="mt-2 truncate text-sm text-foreground">{job.productName}</p>

      {/* Payment warning */}
      {!job.hasPaidDownPayment && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="size-3.5" />
          No down payment
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {job.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(job.dueDate)}
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            isPending
              ? 'bg-muted text-muted-foreground'
              : isInProgress
                ? 'bg-primary/10 text-primary'
                : 'bg-success/10 text-success'
          }`}
        >
          {isPending ? 'Pending' : isInProgress ? 'In progress' : 'Completed'}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {isPending && (
          <StartJobDialog jobId={job.id} hasPaidDownPayment={job.hasPaidDownPayment} />
        )}
        {isInProgress && <CompleteJobButton jobId={job.id} />}
      </div>
    </div>
  );
}
