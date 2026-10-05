import type { JobStatus } from '@yamban/shared';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { SewingBoard } from './sewing-board';

export const metadata: Metadata = { title: 'Sewing' };

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

export default async function SewingPage() {
  const jobs = await apiFetch<StageJobRow[]>('/production/board/SEWING');

  return (
    <div className="max-w-full">
      <PageHeader
        title="Sewing"
        count={jobs.length}
        description="Jobs in sewing stage"
      />

      <div className="mt-6">
        <SewingBoard jobs={jobs} />
      </div>
    </div>
  );
}
