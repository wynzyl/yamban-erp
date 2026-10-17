'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { formatDate, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@yamban/shared';
import { Eye, Pencil, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Money } from '@/components/domain/money';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableRowActions } from '@/components/ui/data-table-row-actions';
import { SortableHeader } from '@/components/ui/sortable-header';

interface PaymentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  paymentDate: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
}

interface PaymentsTableProps {
  data: PaymentRow[];
  sortBy?: string;
  sortOrder?: string;
}

export function PaymentsTable({ data, sortBy, sortOrder }: PaymentsTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<PaymentRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/payments/${deleteTarget.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const columns: ColumnDef<PaymentRow>[] = [
    {
      accessorKey: 'paymentDate',
      header: () => (
        <SortableHeader sortKey="paymentDate" currentSort={sortBy} currentOrder={sortOrder}>
          Date
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Link
          href={`/payments/${row.original.id}`}
          className="whitespace-nowrap font-medium text-foreground hover:text-primary hover:underline"
        >
          {formatDate(row.original.paymentDate)}
        </Link>
      ),
    },
    {
      accessorKey: 'orderNumber',
      header: 'Order',
      cell: ({ row }) => (
        <Link
          href={`/orders/${row.original.orderId}`}
          className="text-primary hover:underline"
        >
          {row.original.orderNumber}
        </Link>
      ),
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const p = row.original;
        const fullName = [p.customerFirstName, p.customerLastName]
          .filter(Boolean)
          .join(' ');
        return <span className="text-muted-foreground">{fullName}</span>;
      },
    },
    {
      accessorKey: 'method',
      header: 'Method',
      cell: ({ row }) => PAYMENT_METHOD_LABELS[row.original.method],
    },
    {
      accessorKey: 'reference',
      header: 'Reference',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.reference ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: () => (
        <SortableHeader sortKey="amount" currentSort={sortBy} currentOrder={sortOrder} className="justify-end">
          Amount
        </SortableHeader>
      ),
      meta: { className: 'text-right' },
      cell: ({ row }) => <Money value={row.original.amount} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <DataTableRowActions
            actions={[
              {
                label: 'View',
                icon: Eye,
                href: `/payments/${p.id}`,
              },
              {
                label: 'Edit',
                icon: Pencil,
                href: `/payments/${p.id}/edit`,
              },
              { type: 'separator' },
              {
                label: 'Delete',
                icon: Trash,
                variant: 'destructive',
                onClick: () => setDeleteTarget(p),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={data} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete payment"
        description={`Are you sure you want to delete this payment for order ${deleteTarget?.orderNumber}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
