'use client';

import { formatDate, formatMoney } from '@yamban/shared';
import { Calendar, CreditCard, Package, Truck, X } from 'lucide-react';
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

interface ReadyItemInfo {
  id: string;
  productName: string;
  quantity: number;
  designFile: DesignFileInfo | null;
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
  items: ReadyItemInfo[];
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

  // Collect all design files from items
  const items = order.items ?? [];
  const designFiles = items
    .map((item) => item.designFile)
    .filter((df): df is DesignFileInfo => df !== null);
  const firstDesign = designFiles[0];

  return (
    <div className="rounded-surface border border-border bg-card overflow-hidden">
      {/* Design thumbnail - single image */}
      {firstDesign && (
        <button
          type="button"
          className="group relative aspect-[16/9] w-full overflow-hidden bg-muted"
          onClick={() => openLightbox(firstDesign.storageKey)}
        >
          <img
            src={`/api/files/${firstDesign.storageKey}`}
            alt="Design"
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          {designFiles.length > 1 && (
            <span className="absolute bottom-2 right-2 rounded bg-foreground/60 px-2 py-0.5 text-xs text-background">
              +{designFiles.length - 1} more
            </span>
          )}
        </button>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Header: Order number + total pcs */}
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={`/orders/${order.id}`}
            className="font-display text-lg font-semibold text-foreground hover:text-primary"
          >
            {order.orderNumber}
          </Link>
          <span className="text-sm tabular-nums text-muted-foreground">
            {order.totalQuantity} pcs
          </span>
        </div>

        {/* Customer */}
        <p className="mt-0.5 text-sm text-muted-foreground">{order.customerName}</p>

        {/* Items list */}
        <ul className="mt-3 space-y-1 border-l-2 border-border pl-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-foreground">{item.productName}</span>
              <span className="tabular-nums text-muted-foreground">{item.quantity}</span>
            </li>
          ))}
        </ul>

        {/* Payment section - Balance leads per design system */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="space-y-0.5">
            {hasBalance ? (
              <>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="yb-money text-lg font-semibold text-partial-text">
                  {formatMoney(order.balance)}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {formatMoney(order.total)} total
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="yb-money text-lg font-semibold text-success">
                  {formatMoney(order.total)}
                </p>
                <p className="text-xs text-success">Paid</p>
              </>
            )}
          </div>

          {/* Action */}
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
                Release
              </Button>
            )}
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        {/* Meta row */}
        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {order.dueDate && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              Due {formatDate(order.dueDate)}
            </span>
          )}
          {order.completedAt && (
            <span className="flex items-center gap-1">
              <Package className="size-3" />
              Packed {formatDate(order.completedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90"
          onClick={() => setShowLightbox(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-background/10 p-2 text-background transition-colors hover:bg-background/20"
            onClick={() => setShowLightbox(false)}
          >
            <X className="size-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Design"
            className="max-h-[90vh] max-w-[90vw] rounded-surface object-contain"
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
