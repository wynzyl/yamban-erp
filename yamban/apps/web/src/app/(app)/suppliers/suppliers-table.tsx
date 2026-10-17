'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { formatMobile } from '@yamban/shared';
import { Eye, Pencil, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableRowActions } from '@/components/ui/data-table-row-actions';
import { SortableHeader } from './sortable-header';

interface SupplierRow {
  id: string;
  name: string;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
}

interface SuppliersTableProps {
  data: SupplierRow[];
  sortBy?: string;
  sortOrder?: string;
}

export function SuppliersTable({ data, sortBy, sortOrder }: SuppliersTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<SupplierRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/suppliers/${deleteTarget.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const columns: ColumnDef<SupplierRow>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <SortableHeader sortKey="name" currentSort={sortBy} currentOrder={sortOrder}>
          Name
        </SortableHeader>
      ),
      cell: ({ row }) => (
        <Link
          href={`/suppliers/${row.original.id}`}
          className="font-medium text-foreground hover:text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'contactPerson',
      header: 'Contact person',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.contactPerson ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'mobile',
      header: 'Mobile',
      cell: ({ row }) => {
        const mobile = row.original.mobile;
        return mobile ? (
          <a
            href={`tel:${mobile}`}
            className="whitespace-nowrap hover:text-primary hover:underline"
          >
            {formatMobile(mobile)}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.original.email;
        return email ? (
          <a
            href={`mailto:${email}`}
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            {email}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <DataTableRowActions
            actions={[
              {
                label: 'View',
                icon: Eye,
                href: `/suppliers/${s.id}`,
              },
              {
                label: 'Edit',
                icon: Pencil,
                href: `/suppliers/${s.id}/edit`,
              },
              { type: 'separator' },
              {
                label: 'Delete',
                icon: Trash,
                variant: 'destructive',
                onClick: () => setDeleteTarget(s),
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
        title="Delete supplier"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
