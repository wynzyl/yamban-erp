'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { formatMoney } from '@yamban/shared';
import { Eye, Pencil, Power, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Money } from '@/components/domain/money';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableRowActions } from '@/components/ui/data-table-row-actions';
import { SortableHeader } from '@/components/ui/sortable-header';

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
  active: boolean;
  createdAt: string;
  orderCount: number;
  totalRevenue: string;
}

interface ProductsTableProps {
  data: ProductRow[];
  sortBy?: string;
  sortOrder?: string;
}

export function ProductsTable({ data, sortBy, sortOrder }: ProductsTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/products/${deleteTarget.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      router.refresh();
    }
  }

  async function handleToggleActive(product: ProductRow) {
    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ active: !product.active }),
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const columns: ColumnDef<ProductRow>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <SortableHeader sortKey="name" currentSort={sortBy} currentOrder={sortOrder}>
          Name
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Link
          href={`/products/${row.original.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'defaultPrice',
      header: () => (
        <SortableHeader
          sortKey="price"
          currentSort={sortBy}
          currentOrder={sortOrder}
          className="justify-end"
        >
          Price
        </SortableHeader>
      ),
      meta: { className: 'text-right' },
      cell: ({ row }) => <Money value={row.original.defaultPrice} />,
    },
    {
      accessorKey: 'usage',
      header: () => (
        <SortableHeader
          sortKey="usage"
          currentSort={sortBy}
          currentOrder={sortOrder}
          className="justify-end"
        >
          Usage
        </SortableHeader>
      ),
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const p = row.original;
        const hasRevenue = parseFloat(p.totalRevenue) > 0;
        return (
          <div className="whitespace-nowrap text-right">
            {p.orderCount > 0 ? (
              <div>
                <span className="text-muted-foreground">
                  {p.orderCount} order{p.orderCount !== 1 ? 's' : ''}
                </span>
                {hasRevenue && (
                  <div className="yb-money text-sm text-muted-foreground">
                    {formatMoney(p.totalRevenue)}
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
      accessorKey: 'active',
      header: () => <span className="block text-center">Status</span>,
      meta: { className: 'text-center' },
      cell: ({ row }) => (
        <span
          className={`inline-flex h-6 items-center rounded-control px-2 text-xs font-medium ${
            row.original.active
              ? 'bg-success/10 text-success'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {row.original.active ? 'Active' : 'Inactive'}
        </span>
      ),
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
                href: `/products/${p.id}`,
              },
              {
                label: 'Edit',
                icon: Pencil,
                href: `/products/${p.id}/edit`,
              },
              { type: 'separator' },
              {
                label: p.active ? 'Deactivate' : 'Activate',
                icon: Power,
                onClick: () => handleToggleActive(p),
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
        title="Delete product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
