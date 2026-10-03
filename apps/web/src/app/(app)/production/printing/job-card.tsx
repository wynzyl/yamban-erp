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

      {/* Design Image Thumbnail */}
      {designImageUrl && (
        <div className="mt-3">
          <button
            type="button"
            className="group relative block overflow-hidden rounded border border-border"
            onClick={() => setShowLightbox(true)}
          >
            <img
              src={designImageUrl}
              alt="Design"
              className="h-24 w-full object-cover transition-opacity group-hover:opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <ImageIcon className="size-6 text-white" />
            </div>
          </button>
        </div>
      )}

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
