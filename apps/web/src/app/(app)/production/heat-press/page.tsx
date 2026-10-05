import type { JobStatus } from '@yamban/shared';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { HeatPressBoard } from './heat-press-board';

export const metadata: Metadata = { title: 'Heat press' };

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

export default async function HeatPressPage() {
  const jobs = await apiFetch<StageJobRow[]>('/production/board/HEAT_PRESS');

  return (
    <div className="max-w-full">
      <PageHeader
        title="Heat press"
        count={jobs.length}
        description="Jobs ready for heat press transfer"
      />

      <div className="mt-6">
        <HeatPressBoard jobs={jobs} />
      </div>
    </div>
  );
}
