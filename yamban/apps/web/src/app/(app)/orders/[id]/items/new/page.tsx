import type { EditPermissions } from '@yamban/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { AddItemForm } from './add-item-form';

export const metadata: Metadata = { title: 'Add item' };

interface OrderDetail {
  id: string;
  orderNumber: string;
}

export default async function AddItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let order: OrderDetail;
  let permissions: EditPermissions;

  try {
    const [orderData, permsData] = await Promise.all([
      apiFetch<OrderDetail>(`/orders/${id}`),
      apiFetch<EditPermissions>(`/orders/${id}/edit-permissions`),
    ]);
    order = orderData;
    permissions = permsData;
  } catch {
    notFound();
  }

  if (!permissions.canAddItems) {
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

      <PageHeader title="Add item" />
      <p className="mt-1 text-sm text-muted-foreground">
        Order {order.orderNumber}
      </p>

      <div className="mt-6">
        <AddItemForm orderId={id} />
      </div>
    </div>
  );
}
