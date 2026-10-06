'use client';

import { formatDate, formatMoney } from '@yamban/shared';
import { Calendar, CreditCard, Image as ImageIcon, Package, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

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
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  const openLightbox = (storageKey: string) => {
    setLightboxImage(`/api/files/${storageKey}`);
    setShowLightbox(true);
  };

  return (
    <div className="rounded-surface border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        {/* Left: Text content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header row: Order number + quantity */}
          <div className="flex items-center gap-2">
            <Link
              href={`/orders/${order.id}`}
              className="truncate font-medium text-foreground hover:text-primary hover:underline"
            >
              {order.orderNumber}
            </Link>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {order.totalQuantity} pcs
            </span>
          </div>

          {/* Customer name */}
          <p className="truncate text-sm text-muted-foreground">{order.customerName}</p>

          {/* Payment info */}
          <div className="mt-1.5 space-y-0.5 text-sm">
            <div className="flex gap-3">
              <span className="text-muted-foreground">Total: <span className="font-medium text-foreground">{formatMoney(order.total)}</span></span>
              <span className="text-muted-foreground">Paid: <span className="text-success">{formatMoney(order.paid)}</span></span>
            </div>
            {hasBalance && (
              <div className="text-muted-foreground">
                Balance: <span className="font-medium text-destructive">{formatMoney(order.balance)}</span>
              </div>
            )}
          </div>

          {/* Meta row: dates */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {order.dueDate && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="size-3" />
                {formatDate(order.dueDate)}
              </span>
            )}
            {order.completedAt && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Package className="size-3" />
                Packed {formatDate(order.completedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Middle: Design thumbnails */}
        {order.designFiles.length > 0 && (
          <div className="flex shrink-0 gap-1 self-center">
            {order.designFiles.slice(0, 2).map((file) => (
              <button
                key={file.id}
                type="button"
                className="group relative h-20 w-[120px] shrink-0 overflow-hidden rounded border border-border"
                onClick={() => openLightbox(file.storageKey)}
              >
                <img
                  src={`/api/files/${file.storageKey}`}
                  alt="Design"
                  className="size-full object-cover transition-opacity group-hover:opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                  <ImageIcon className="size-5 text-white" />
                </div>
              </button>
            ))}
            {order.designFiles.length > 2 && (
              <div className="flex h-20 w-10 items-center justify-center rounded border border-border bg-muted text-xs text-muted-foreground">
                +{order.designFiles.length - 2}
              </div>
            )}
          </div>
        )}

        {/* Right: Action button */}
        <div className="shrink-0">
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

      {/* Lightbox */}
      {showLightbox && lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 text-white hover:text-gray-300"
            onClick={() => setShowLightbox(false)}
          >
            <X className="size-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Design"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
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
