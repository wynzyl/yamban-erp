'use client';

import { formatDate, type JobStatus } from '@yamban/shared';
import { Calendar, Check, Image as ImageIcon, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

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

interface PackagingBoardProps {
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
  const [showLightbox, setShowLightbox] = useState(false);

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
  const isCompleted = job.status === 'COMPLETED';
  const designImageUrl = job.designFile
    ? `/api/files/${job.designFile.storageKey}`
    : null;

  return (
    <div className="rounded-surface border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        {/* Left: Text content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header row: Order number + quantity */}
          <div className="flex items-center gap-2">
            <Link
              href={`/orders/${job.orderId}`}
              className="truncate font-medium text-foreground hover:text-primary hover:underline"
            >
              {job.orderNumber}
            </Link>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {job.quantity} pcs
            </span>
          </div>

          {/* Customer name */}
          <p className="truncate text-sm text-muted-foreground">{job.customerName}</p>

          {/* Product name */}
          <p className="mt-1 truncate text-sm text-foreground">{job.productName}</p>

          {/* Size breakdown */}
          {job.sizes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {job.sizes.map((s) => (
                <span
                  key={s.size}
                  className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                >
                  {s.size}: {s.quantity}
                </span>
              ))}
            </div>
          )}

          {/* Roster preview - grouped by size */}
          {job.roster.length > 0 && (
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs font-medium text-foreground">
                Roster ({job.roster.length} players)
              </summary>
              <div className="mt-1 space-y-1">
                {(() => {
                  // Get unique sizes from roster entries
                  const rosterSizes = [...new Set(job.roster.map((r) => r.size))];
                  // Use roster sizes for grouping (handles ONE_SIZE mismatch)
                  const sizesToShow = rosterSizes.length > 0 ? rosterSizes : job.sizes.map((s) => s.size);
                  return sizesToShow.map((size) => {
                    const playersInSize = job.roster.filter((r) => r.size === size);
                    if (playersInSize.length === 0) return null;
                    return (
                      <div key={size} className="text-xs">
                        <div className="font-medium text-muted-foreground">{size}</div>
                        <div className="mt-0.5 space-y-0.5 pl-2">
                          {playersInSize.map((r, idx) => (
                            <div key={idx} className="text-foreground">
                              {r.jerseyNumber && <span className="font-mono">#{r.jerseyNumber} </span>}
                              {r.playerName}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </details>
          )}

          {/* Meta row: date, status badge */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {job.dueDate && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-3" />
                {formatDate(job.dueDate)}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 ${
                isCompleted
                  ? 'bg-success/10 text-success'
                  : isInProgress
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {isCompleted ? 'Ready' : isInProgress ? 'In progress' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Middle: Design thumbnail */}
        {designImageUrl && (
          <button
            type="button"
            className="group relative h-20 w-[120px] shrink-0 self-center overflow-hidden rounded border border-border"
            onClick={() => setShowLightbox(true)}
          >
            <img
              src={designImageUrl}
              alt="Design"
              className="size-full object-cover transition-opacity group-hover:opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <ImageIcon className="size-5 text-white" />
            </div>
          </button>
        )}

        {/* Right: Action button */}
        {!isCompleted && (
          <div className="shrink-0">
            <Button size="sm" onClick={handleComplete} disabled={isPending}>
              <Check className="size-4" />
              Mark ready
            </Button>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {showLightbox && designImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-white hover:text-gray-300"
            onClick={() => setShowLightbox(false)}
          >
            <X className="size-8" />
          </button>
          <img
            src={designImageUrl}
            alt="Design"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export function PackagingBoard({ jobs }: PackagingBoardProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-surface border border-dashed border-border p-8 text-center text-muted-foreground">
        No jobs in packaging. Jobs appear here when sewing is completed.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
