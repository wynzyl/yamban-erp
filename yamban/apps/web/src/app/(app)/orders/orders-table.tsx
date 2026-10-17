'use client';

import { type ColumnDef } from '@tanstack/react-table';
import {
  formatDate,
  formatMoney,
  PRODUCTION_STAGE_LABELS,
  type OrderStatus,
  type ProductionStage,
} from '@yamban/shared';
import { Banknote, Eye, Pencil, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  CollectPaymentModal,
  type OrderForPayment,
} from '@/components/domain/collect-payment-modal';
import { PaymentChip, paymentTier } from '@/components/domain/payment-chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableRowActions } from '@/components/ui/data-table-row-actions';
import { cn } from '@/lib/utils';
import { SortableHeader } from '@/components/ui/sortable-header';

interface OrderRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  organizationName: string | null;
  orderDate: string;
  dueDate: string | null;
  status: OrderStatus;
  productionStage: ProductionStage | null;
  total: string;
  paidAmount: string;
  itemCount: number;
  daysOverdue?: number;
}

interface OrdersTableProps {
  data: OrderRow[];
  statusFilter?: string;
  sortBy?: string;
  sortOrder?: string;
}

function StageIndicator({
  order,
  showDetail,
}: {
  order: OrderRow;
  showDetail: boolean;
}) {
  if (order.status === 'RELEASED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-success" />
        <span className="font-medium text-success">Released</span>
      </span>
    );
  }

  if (order.status === 'READY' || order.productionStage === 'PACKAGING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-primary" />
        <span className="font-medium text-primary">Ready</span>
      </span>
    );
  }

  if (order.productionStage) {
    const label = showDetail
      ? PRODUCTION_STAGE_LABELS[order.productionStage]
      : 'Production';

    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-primary" />
        <span className="font-medium text-primary">{label}</span>
      </span>
    );
  }

  if (order.status === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-muted-foreground" />
        <span className="text-muted-foreground">Confirmed</span>
      </span>
    );
  }

  if (order.status === 'QUOTATION') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full border border-muted-foreground" />
        <span className="text-muted-foreground">Quotation</span>
      </span>
    );
  }

  if (order.status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-destructive" />
        <span className="text-destructive">Cancelled</span>
      </span>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}

export function OrdersTable({ data, statusFilter, sortBy, sortOrder }: OrdersTableProps) {
  const router = useRouter();
  const showStageDetail = statusFilter === 'IN_PRODUCTION';
  const [paymentOrder, setPaymentOrder] = useState<OrderForPayment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);

  async function handleCancel() {
    if (!cancelTarget) return;
    const res = await fetch(`/api/orders/${cancelTarget.id}/cancel`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: 'orderNumber',
      header: 'Order',
      cell: ({ row }) => (
        <Link
          href={`/orders/${row.original.id}`}
          className="font-display text-[15px] font-semibold text-primary hover:underline"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div>
            <div className="font-medium">
              {o.organizationName || `${o.customerFirstName} ${o.customerLastName}`.trim()}
            </div>
            <div className="text-sm text-muted-foreground">
              {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ row }) => (
        <StageIndicator order={row.original} showDetail={showStageDetail} />
      ),
    },
    {
      accessorKey: 'orderDate',
      header: () => (
        <SortableHeader sortKey="orderDate" currentSort={sortBy} currentOrder={sortOrder}>
          Date
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDate(row.original.orderDate)}
        </span>
      ),
    },
    {
      accessorKey: 'dueDate',
      header: () => (
        <SortableHeader sortKey="dueDate" currentSort={sortBy} currentOrder={sortOrder}>
          Due
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {row.original.dueDate ? formatDate(row.original.dueDate) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'balance',
      header: () => (
        <SortableHeader sortKey="balance" currentSort={sortBy} currentOrder={sortOrder} className="justify-end">
          Balance
        </SortableHeader>
      ),
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const o = row.original;
        const total = Number(o.total);
        const paid = Number(o.paidAmount);
        const balance = total - paid;
        const tier = paymentTier(total, paid, o.daysOverdue ?? 0);

        const balanceColorClass =
          tier === 'overdue'
            ? 'text-destructive'
            : balance > 0
              ? 'text-partial-text'
              : 'text-foreground';

        return (
          <span className={cn('yb-money text-[17px] font-semibold', balanceColorClass)}>
            {formatMoney(balance)}
          </span>
        );
      },
    },
    {
      accessorKey: 'total',
      header: () => (
        <SortableHeader sortKey="total" currentSort={sortBy} currentOrder={sortOrder} className="justify-end">
          Total
        </SortableHeader>
      ),
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <span className="yb-money text-muted-foreground">
          {formatMoney(row.original.total)}
        </span>
      ),
    },
    {
      accessorKey: 'payment',
      header: 'Payment',
      cell: ({ row }) => (
        <PaymentChip
          total={row.original.total}
          paid={row.original.paidAmount}
          daysOverdue={row.original.daysOverdue}
        />
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const o = row.original;
        const total = Number(o.total);
        const paid = Number(o.paidAmount);
        const balance = total - paid;
        const canCollect = balance > 0 && o.status !== 'CANCELLED';
        const canCancel = o.status !== 'CANCELLED' && o.status !== 'RELEASED';

        return (
          <DataTableRowActions
            actions={[
              {
                label: 'View',
                icon: Eye,
                href: `/orders/${o.id}`,
              },
              {
                label: 'Edit',
                icon: Pencil,
                href: `/orders/${o.id}/edit`,
              },
              ...(canCollect
                ? [
                    { type: 'separator' as const },
                    {
                      label: 'Collect payment',
                      icon: Banknote,
                      onClick: () => {
                        setPaymentOrder({
                          id: o.id,
                          orderNumber: o.orderNumber,
                          total: o.total,
                          paidAmount: o.paidAmount,
                          daysOverdue: o.daysOverdue,
                        });
                      },
                    },
                  ]
                : []),
              ...(canCancel
                ? [
                    { type: 'separator' as const },
                    {
                      label: 'Cancel order',
                      icon: XCircle,
                      variant: 'destructive' as const,
                      onClick: () => setCancelTarget(o),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={data} />
      {paymentOrder && (
        <CollectPaymentModal
          order={paymentOrder}
          open={!!paymentOrder}
          onOpenChange={(open) => {
            if (!open) setPaymentOrder(null);
          }}
        />
      )}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel order"
        description={`Are you sure you want to cancel order ${cancelTarget?.orderNumber}? This action cannot be undone.`}
        confirmLabel="Cancel order"
        variant="destructive"
        onConfirm={handleCancel}
      />
    </>
  );
}
