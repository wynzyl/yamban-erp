import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { EditOrderForm } from './edit-form';

export const metadata: Metadata = { title: 'Edit order' };

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  dueDate: string | null;
  discount: string;
  notes: string | null;
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: OrderDetail;
  try {
    order = await apiFetch<OrderDetail>(`/orders/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <Link
          href={`/orders/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to order
        </Link>
      </div>

      <PageHeader title={`Edit ${order.orderNumber}`} />

      <div className="mt-6">
        <EditOrderForm order={order} />
      </div>
    </div>
  );
}
