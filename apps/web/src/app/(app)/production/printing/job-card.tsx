'use client';

import { formatDate, type JobStatus } from '@yamban/shared';
import { AlertTriangle, Calendar, Image as ImageIcon, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { StartJobDialog } from './start-job-dialog';
import { CompleteJobButton } from './complete-job-button';

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

interface JobCardProps {
  job: StageJobRow;
}

export function JobCard({ job }: JobCardProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const isPending = job.status === 'PENDING';
  const isInProgress = job.status === 'IN_PROGRESS';

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

          {/* Meta row: warnings, date, status badge */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {!job.hasPaidDownPayment && (
              <span className="flex items-center gap-1 text-partial-text">
                <AlertTriangle className="size-3" />
                No down payment
              </span>
            )}
            {job.dueDate && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-3" />
                {formatDate(job.dueDate)}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 ${
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
        <div className="shrink-0">
          {isPending && (
            <StartJobDialog jobId={job.id} hasPaidDownPayment={job.hasPaidDownPayment} />
          )}
          {isInProgress && <CompleteJobButton jobId={job.id} />}
        </div>
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
