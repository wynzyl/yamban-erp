import type { EditPermissions } from '@yamban/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { NotesEditForm } from './notes-form';

export const metadata: Metadata = { title: 'Edit notes' };

interface OrderDetail {
  id: string;
  orderNumber: string;
  notes: string | null;
}

export default async function EditNotesPage({
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

  if (!permissions.canEditPrices) {
    redirect(`/orders/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href={`/orders/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to order
        </Link>
      </div>

      <PageHeader title="Edit notes" />
      <p className="mt-1 text-sm text-muted-foreground">
        Order {order.orderNumber}
      </p>

      <div className="mt-6">
        <NotesEditForm orderId={id} notes={order.notes} />
      </div>
    </div>
  );
}
