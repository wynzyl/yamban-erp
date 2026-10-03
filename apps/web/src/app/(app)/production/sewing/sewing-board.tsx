'use client';

import { formatDate, type JobStatus } from '@yamban/shared';
import { Calendar, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

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
}

interface SewingBoardProps {
  jobs: StageJobRow[];
}

async function completeJob(jobId: string) {
  const res = await fetch(`/api/production/jobs/${jobId}/complete`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to complete job');
  }
  return res.json();
}

function JobCard({ job }: { job: StageJobRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    setError(null);
    try {
      await completeJob(job.id);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

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

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {job.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(job.dueDate)}
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            isInProgress
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {isInProgress ? 'In progress' : 'Pending'}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-4">
        <Button size="sm" onClick={handleComplete} disabled={isPending}>
          <Check className="size-4" />
          Mark complete
        </Button>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function SewingBoard({ jobs }: SewingBoardProps) {
  // Filter out completed jobs (they should move to PACKAGING)
  const activeJobs = jobs.filter((j) => j.status !== 'COMPLETED');

  if (activeJobs.length === 0) {
    return (
      <div className="rounded-surface border border-dashed border-border p-8 text-center text-muted-foreground">
        No jobs in sewing. Jobs appear here when heat press is completed.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {activeJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
