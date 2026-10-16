import type { EditPermissions, GarmentSize } from '@yamban/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { RosterEditForm } from './roster-form';

export const metadata: Metadata = { title: 'Edit roster' };

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
  items: OrderItem[];
}

export default async function EditRosterPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
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

  if (!permissions.canEditRoster) {
    redirect(`/orders/${id}`);
  }

  const item = order.items.find((i) => i.id === itemId);
  if (!item) {
    notFound();
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

      <PageHeader title={`Edit roster: ${item.productName}`} />
      <p className="mt-1 text-sm text-muted-foreground">
        Order {order.orderNumber}
      </p>

      <div className="mt-6">
        <RosterEditForm orderId={id} item={item} />
      </div>
    </div>
  );
}
