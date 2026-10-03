'use client';

import { formatDate, formatMoney } from '@yamban/shared';
import { Calendar, CreditCard, Package, Truck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

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
}

interface ReadyBoardProps {
  orders: ReadyOrderRow[];
}

async function releaseOrder(orderId: string) {
  const res = await fetch(`/api/production/orders/${orderId}/release`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to release order');
  }
  return res.json();
}

function OrderCard({ order }: { order: ReadyOrderRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleRelease = async () => {
    setError(null);
    try {
      await releaseOrder(order.id);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const balanceNum = parseFloat(order.balance);
  const hasBalance = balanceNum > 0;

  return (
    <div className="rounded-surface border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/orders/${order.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {order.orderNumber}
          </Link>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {order.customerName}
          </p>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {order.totalQuantity} pcs
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{formatMoney(order.total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span className="text-success">{formatMoney(order.paid)}</span>
        </div>
        {hasBalance && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Balance</span>
            <span className="font-medium text-destructive">{formatMoney(order.balance)}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        {order.dueDate && (
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            {formatDate(order.dueDate)}
          </span>
        )}
        {order.completedAt && (
          <span className="flex items-center gap-1">
            <Package className="size-3" />
            Packed {formatDate(order.completedAt)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {hasBalance ? (
          <Button size="sm" asChild>
            <Link href={`/payments/new?orderId=${order.id}`}>
              <CreditCard className="size-4" />
              Receive payment
            </Link>
          </Button>
        ) : (
          <Button size="sm" onClick={handleRelease} disabled={isPending}>
            <Truck className="size-4" />
            Mark delivered
          </Button>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

export function ReadyBoard({ orders }: ReadyBoardProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-surface border border-dashed border-border p-8 text-center text-muted-foreground">
        No orders ready for pickup. Orders appear here when all items are packaged.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
