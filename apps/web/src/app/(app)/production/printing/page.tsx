import type { JobStatus } from '@yamban/shared';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { PrintBoard } from './print-board';

export const metadata: Metadata = { title: 'Print queue' };

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

export default async function PrintingPage() {
  const jobs = await apiFetch<StageJobRow[]>('/production/board/PRINTING');

  return (
    <div className="max-w-full">
      <PageHeader
        title="Print queue"
        count={jobs.length}
        description="Jobs ready for sublimation printing"
      />

      <div className="mt-6">
        <PrintBoard jobs={jobs} />
      </div>
    </div>
  );
}
