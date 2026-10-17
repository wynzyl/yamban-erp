'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { formatDate, formatMobile, formatMoney } from '@yamban/shared';
import { Eye, Pencil, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { CustomerAvatar } from '@/components/domain/customer-avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableRowActions } from '@/components/ui/data-table-row-actions';
import { SortableHeader } from '@/components/ui/sortable-header';

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  organizationName: string | null;
  mobile: string | null;
  municipality: string | null;
  createdAt: string;
  orderCount: number;
  outstandingBalance: string;
}

interface CustomersTableProps {
  data: CustomerRow[];
  sortBy?: string;
  sortOrder?: string;
}

export function CustomersTable({ data, sortBy, sortOrder }: CustomersTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/customers/${deleteTarget.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const columns: ColumnDef<CustomerRow>[] = [
    {
      id: 'avatar',
      header: () => null,
      cell: ({ row }) => (
        <CustomerAvatar
          firstName={row.original.firstName}
          lastName={row.original.lastName}
          size="sm"
        />
      ),
    },
    {
      accessorKey: 'name',
      header: () => (
        <SortableHeader sortKey="name" currentSort={sortBy} currentOrder={sortOrder}>
          Name
        </SortableHeader>
      ),
      cell: ({ row }) => {
        const fullName = [row.original.firstName, row.original.lastName]
          .filter(Boolean)
          .join(' ');
        return (
          <Link
            href={`/customers/${row.original.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {fullName}
          </Link>
        );
      },
    },
    {
      accessorKey: 'organizationName',
      header: 'Organisation',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.organizationName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'mobile',
      header: 'Mobile',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.mobile ? formatMobile(row.original.mobile) : '—'}
        </span>
      ),
    },
    {
      accessorKey: 'municipality',
      header: () => (
        <SortableHeader sortKey="location" currentSort={sortBy} currentOrder={sortOrder}>
          Location
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.municipality ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'account',
      header: () => (
        <SortableHeader
          sortKey="balance"
          currentSort={sortBy}
          currentOrder={sortOrder}
          className="justify-end"
        >
          Account
        </SortableHeader>
      ),
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const c = row.original;
        const hasBalance = parseFloat(c.outstandingBalance) > 0;
        return (
          <div className="whitespace-nowrap text-right">
            {c.orderCount > 0 ? (
              <div>
                <span className="text-muted-foreground">
                  {c.orderCount} order{c.orderCount !== 1 ? 's' : ''}
                </span>
                {hasBalance && (
                  <div className="yb-money text-sm font-medium text-partial-text">
                    {formatMoney(c.outstandingBalance)} due
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => (
        <SortableHeader
          sortKey="createdAt"
          currentSort={sortBy}
          currentOrder={sortOrder}
          className="justify-end"
        >
          Added
        </SortableHeader>
      ),
      meta: { className: 'text-right' },
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-right text-muted-foreground block">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          actions={[
            {
              label: 'View',
              icon: Eye,
              href: `/customers/${row.original.id}`,
            },
            {
              label: 'Edit',
              icon: Pencil,
              href: `/customers/${row.original.id}/edit`,
            },
            { type: 'separator' },
            {
              label: 'Delete',
              icon: Trash,
              variant: 'destructive',
              onClick: () => setDeleteTarget(row.original),
            },
          ]}
        />
      ),
    },
  ];

  const deleteName = deleteTarget
    ? [deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(' ')
    : '';

  return (
    <>
      <DataTable columns={columns} data={data} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete customer"
        description={`Are you sure you want to delete "${deleteName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
