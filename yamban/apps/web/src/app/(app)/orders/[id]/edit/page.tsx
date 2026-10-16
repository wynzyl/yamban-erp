import type { GarmentSize } from '@yamban/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { EditOrderForm } from './edit-form';

export const metadata: Metadata = { title: 'Edit order' };

interface OrderItemSize {
  id: string;
  orderItemId: string;
  size: GarmentSize;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface RosterEntry {
  id: string;
  orderItemId: string;
  playerName: string;
  jerseyNumber: string | null;
  size: GarmentSize;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  quantity: number;
  subtotal: string;
  sizes: OrderItemSize[];
  roster: RosterEntry[];
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  dueDate: string | null;
  discount: string;
  notes: string | null;
  items: OrderItem[];
}

export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: OrderDetail;
  let isEditable = false;

  try {
    const [orderData, editableData] = await Promise.all([
      apiFetch<OrderDetail>(`/orders/${id}`),
      apiFetch<{ editable: boolean }>(`/orders/${id}/editable`),
    ]);
    order = orderData;
    isEditable = editableData.editable;
  } catch {
    notFound();
  }

  // Redirect if not editable
  if (!isEditable) {
    redirect(`/orders/${id}`);
  }

  return (
    <div className="max-w-3xl">
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
