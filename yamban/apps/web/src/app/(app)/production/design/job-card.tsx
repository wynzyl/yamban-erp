import { formatDate } from '@yamban/shared';
import { Calendar, FileImage, User } from 'lucide-react';
import Link from 'next/link';

interface DesignJobRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  productName: string;
  quantity: number;
  dueDate: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  hasFile: boolean;
  isReady: boolean;
}

interface JobCardProps {
  job: DesignJobRow;
}

export function JobCard({ job }: JobCardProps) {
  const customerName = [job.customerFirstName, job.customerLastName].filter(Boolean).join(' ');

  return (
    <Link
      href={`/production/design/${job.id}`}
      className="block rounded-surface border border-border bg-card p-3 transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{job.orderNumber}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{customerName}</p>
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
        <span className="flex items-center gap-1">
          <FileImage className="size-3" />
          {job.hasFile ? 'File uploaded' : 'No file'}
        </span>
      </div>
    </Link>
  );
}
