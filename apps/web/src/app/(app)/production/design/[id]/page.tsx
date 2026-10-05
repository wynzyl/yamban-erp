import type { JobStatus } from '@yamban/shared';
import { ArrowLeft, Calendar, Package, User } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { AssignDialog } from './assign-dialog';
import { FileUpload } from './file-upload';
import { ReadyAction } from './ready-action';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const job = await apiFetch<{ orderNumber: string }>(`/design/${id}`);
    return { title: `Design - ${job.orderNumber}` };
  } catch {
    return { title: 'Design job not found' };
  }
}

interface DesignJobDetail {
  id: string;
  productionJobId: string;
  requirements: string | null;
  referenceNotes: string | null;
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
  fileId: string | null;
  fileName: string | null;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default async function DesignJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let job: DesignJobDetail;
  let designers: UserRow[] = [];

  try {
    [job, designers] = await Promise.all([
      apiFetch<DesignJobDetail>(`/design/${id}`),
      apiFetch<UserRow[]>('/users?role=DESIGNER'),
    ]);
  } catch {
    notFound();
  }

  const customerName = [job.customerFirstName, job.customerLastName].filter(Boolean).join(' ');

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link
          href="/production/design"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to design board
        </Link>
      </div>

      <PageHeader title={`Design - ${job.orderNumber}`}>
        <AssignDialog jobId={job.id} currentAssigneeId={job.assignedToId} designers={designers} />
      </PageHeader>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Job Info */}
        <Surface className="p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Job details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium text-primary">
                {job.isReady ? 'Ready for print' : 'Pending'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Quantity</dt>
              <dd>{job.quantity} pcs</dd>
            </div>
            {job.dueDate && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Due date</dt>
                <dd className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {job.dueDate}
                </dd>
              </div>
            )}
          </dl>
        </Surface>

        {/* Order Info */}
        <Surface className="p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Order</h2>
          <div className="space-y-2 text-sm">
            <Link
              href={`/orders/${job.orderId}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {job.orderNumber}
            </Link>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-3.5" />
              <Link
                href={`/customers/${job.customerId}`}
                className="hover:text-foreground hover:underline"
              >
                {customerName}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="size-3.5" />
              {job.productName}
            </div>
          </div>
        </Surface>

        {/* Assignment */}
        <Surface className="p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Assigned to</h2>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <User className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {job.assignedToName ?? 'Unassigned'}
              </p>
            </div>
          </div>
        </Surface>
      </div>

      {/* Design File */}
      <Surface className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Design file</h2>
        <FileUpload
          designJobId={job.id}
          currentFile={job.fileId ? { id: job.fileId, fileName: job.fileName! } : null}
        />
      </Surface>

      {/* Ready for Print Action */}
      <Surface className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Print status</h2>
        <ReadyAction
          designJobId={job.id}
          hasFile={job.hasFile}
          isReady={job.isReady}
        />
      </Surface>

      {/* Requirements */}
      <Surface className="mt-6 p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Requirements</h2>
        <p className="whitespace-pre-wrap text-sm">
          {job.requirements ?? 'No requirements specified.'}
        </p>
      </Surface>

      {/* Reference Notes */}
      {job.referenceNotes && (
        <Surface className="mt-6 p-4">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Reference notes</h2>
          <p className="whitespace-pre-wrap text-sm">{job.referenceNotes}</p>
        </Surface>
      )}
    </div>
  );
}
