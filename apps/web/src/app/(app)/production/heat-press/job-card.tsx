'use client';

import { formatDate, type JobStatus } from '@yamban/shared';
import { Calendar, Check, Printer } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { CompleteJobButton } from './complete-job-button';
import { JobTicket } from './job-ticket';

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

interface JobCardProps {
  job: StageJobRow;
}

export function JobCard({ job }: JobCardProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const isPending = job.status === 'PENDING';
  const isInProgress = job.status === 'IN_PROGRESS';

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
    documentTitle: `Ticket-${job.orderNumber}`,
  });

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

      {/* Size breakdown */}
      {job.sizes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
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
        <Button size="sm" variant="outline" onClick={() => handlePrint()}>
          <Printer className="size-4" />
          Print ticket
        </Button>
        {(isPending || isInProgress) && <CompleteJobButton jobId={job.id} />}
      </div>

      {/* Hidden printable ticket */}
      <JobTicket
        ref={ticketRef}
        customerName={job.customerName}
        productName={job.productName}
        orderNumber={job.orderNumber}
        quantity={job.quantity}
        sizes={job.sizes}
      />
    </div>
  );
}
