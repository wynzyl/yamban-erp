'use client';

import { formatDate, type JobStatus } from '@yamban/shared';
import { Calendar, Check, Image as ImageIcon, Printer, X } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { CompleteJobButton } from './complete-job-button';
import { JobTicket } from './job-ticket';

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
  const ticketRef = useRef<HTMLDivElement>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const isPending = job.status === 'PENDING';
  const isInProgress = job.status === 'IN_PROGRESS';

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: `Ticket-${job.orderNumber}`,
  });

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
                {job.sizes.map((s) => {
                  const playersInSize = job.roster.filter((r) => r.size === s.size);
                  if (playersInSize.length === 0) return null;
                  return (
                    <div key={s.size} className="text-xs">
                      <div className="font-medium text-muted-foreground">{s.size}</div>
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
                })}
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

        {/* Right: Action buttons */}
        <div className="flex shrink-0 flex-col gap-2">
          <Button size="sm" variant="outline" onClick={() => handlePrint()}>
            <Printer className="size-4" />
            Print ticket
          </Button>
          {(isPending || isInProgress) && <CompleteJobButton jobId={job.id} />}
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

      {/* Hidden printable ticket */}
      <JobTicket
        ref={ticketRef}
        customerName={job.customerName}
        productName={job.productName}
        orderNumber={job.orderNumber}
        quantity={job.quantity}
        sizes={job.sizes}
        roster={job.roster}
        designImageUrl={designImageUrl}
      />
    </div>
  );
}
