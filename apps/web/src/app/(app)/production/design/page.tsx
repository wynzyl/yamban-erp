import type { JobStatus } from '@yamban/shared';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { DesignBoard } from './design-board';

export const metadata: Metadata = { title: 'Design' };

interface DesignJobRow {
  id: string;
  productionJobId: string;
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
}

interface DesignBoardData {
  pending: DesignJobRow[];
  ready: DesignJobRow[];
}

export default async function DesignPage() {
  const board = await apiFetch<DesignBoardData>('/design/board');

  const totalJobs = board.pending.length + board.ready.length;

  return (
    <div className="max-w-full">
      <PageHeader
        title="Design"
        count={totalJobs}
        description="Upload final designs and mark ready for print"
      />

      <div className="mt-6">
        <DesignBoard board={board} />
      </div>
    </div>
  );
}
