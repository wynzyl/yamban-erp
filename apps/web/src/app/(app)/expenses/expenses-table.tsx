'use client';

import { type ColumnDef } from '@tanstack/react-table';
import {
  EXPENSE_CATEGORY_LABELS,
  formatDate,
  PAYMENT_METHOD_LABELS,
  type ExpenseCategory,
  type PaymentMethod,
} from '@yamban/shared';
import { Eye, Pencil, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Money } from '@/components/domain/money';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableRowActions } from '@/components/ui/data-table-row-actions';

interface ExpenseRow {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  supplierName: string | null;
  amount: string;
  paymentMethod: PaymentMethod;
  description: string;
  orderNumber: string | null;
  createdAt: string;
}

interface ExpensesTableProps {
  data: ExpenseRow[];
}

export function ExpensesTable({ data }: ExpensesTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/expenses/${deleteTarget.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const columns: ColumnDef<ExpenseRow>[] = [
    {
      accessorKey: 'expenseDate',
      header: 'Date',
      cell: ({ row }) => (
        <Link
          href={`/expenses/${row.original.id}`}
          className="whitespace-nowrap font-medium text-foreground hover:text-primary hover:underline"
        >
          {formatDate(row.original.expenseDate)}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block">
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {EXPENSE_CATEGORY_LABELS[row.original.category]}
        </span>
      ),
    },
    {
      accessorKey: 'supplierName',
      header: 'Supplier',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.supplierName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Method',
      cell: ({ row }) => PAYMENT_METHOD_LABELS[row.original.paymentMethod],
    },
    {
      accessorKey: 'amount',
      header: () => <span className="block text-right">Amount</span>,
      meta: { className: 'text-right' },
      cell: ({ row }) => <Money value={row.original.amount} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const e = row.original;
        return (
          <DataTableRowActions
            actions={[
              {
                label: 'View',
                icon: Eye,
                href: `/expenses/${e.id}`,
              },
              {
                label: 'Edit',
                icon: Pencil,
                href: `/expenses/${e.id}/edit`,
              },
              { type: 'separator' },
              {
                label: 'Delete',
                icon: Trash,
                variant: 'destructive',
                onClick: () => setDeleteTarget(e),
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
        title="Delete expense"
        description={`Are you sure you want to delete this expense for "${deleteTarget?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
