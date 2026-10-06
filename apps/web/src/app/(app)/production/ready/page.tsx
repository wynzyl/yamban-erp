import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { ReadyBoard } from './ready-board';

export const metadata: Metadata = { title: 'Ready for pickup' };

interface DesignFileInfo {
  id: string;
  fileName: string;
  storageKey: string;
  isFinal: boolean;
}

interface ReadyOrderRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  totalQuantity: number;
  total: string;
  paid: string;
  balance: string;
  dueDate: string | null;
  completedAt: string | null;
  designFiles: DesignFileInfo[];
}

export default async function ReadyPage() {
  const orders = await apiFetch<ReadyOrderRow[]>('/production/ready');

  return (
    <div className="max-w-full">
      <PageHeader
        title="Ready for pickup"
        count={orders.length}
        description="Orders ready to be released to customers"
      />

      <div className="mt-6">
        <ReadyBoard orders={orders} />
      </div>
    </div>
  );
}
