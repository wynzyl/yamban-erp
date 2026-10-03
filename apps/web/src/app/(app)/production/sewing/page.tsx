import type { JobStatus } from '@yamban/shared';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { SewingBoard } from './sewing-board';

export const metadata: Metadata = { title: 'Sewing' };

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
