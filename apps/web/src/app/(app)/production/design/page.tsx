import { DESIGN_APPROVAL_STATUS_LABELS, type DesignApprovalStatus } from '@yamban/shared';
import { Palette } from 'lucide-react';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { DesignBoard } from './design-board';

export const metadata: Metadata = { title: 'Design' };

interface DesignJobRow {
  id: string;
  productionJobId: string;
  approvalStatus: DesignApprovalStatus;
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
}

interface DesignBoardData {
  DRAFTING: DesignJobRow[];
  FOR_APPROVAL: DesignJobRow[];
  REVISION_REQUESTED: DesignJobRow[];
  APPROVED: DesignJobRow[];
}

export default async function DesignPage() {
  const board = await apiFetch<DesignBoardData>('/design/board');

  const totalJobs =
    board.DRAFTING.length +
    board.FOR_APPROVAL.length +
    board.REVISION_REQUESTED.length +
    board.APPROVED.length;

  return (
    <div className="max-w-full">
      <PageHeader
        title="Design"
        count={totalJobs}
        description="Manage design jobs and approval workflow"
      />

      <div className="mt-6">
        <DesignBoard board={board} labels={DESIGN_APPROVAL_STATUS_LABELS} />
      </div>
    </div>
  );
}
