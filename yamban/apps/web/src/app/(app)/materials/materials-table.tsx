'use client';

import { type ColumnDef } from '@tanstack/react-table';
import {
  formatMeasure,
  MATERIAL_CATEGORY_LABELS,
  UNIT_SUFFIX,
  type StockUnit,
} from '@yamban/shared';
import { Eye, Pencil, PackagePlus, Trash } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableRowActions } from '@/components/ui/data-table-row-actions';
import { StockBadge } from './stock-badge';

interface MaterialRow {
  id: string;
  name: string;
  color: string | null;
  category: string;
  unit: StockUnit;
  stockOnHand: string;
  reorderLevel: string;
  supplierName: string | null;
}

interface MaterialsTableProps {
  data: MaterialRow[];
}

export function MaterialsTable({ data }: MaterialsTableProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<MaterialRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/materials/${deleteTarget.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      router.refresh();
    }
  }

  const columns: ColumnDef<MaterialRow>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <Link
            href={`/materials/${m.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {m.name}
            {m.color && (
              <span className="ml-1 text-muted-foreground">({m.color})</span>
            )}
          </Link>
        );
      },
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {MATERIAL_CATEGORY_LABELS[
            row.original.category as keyof typeof MATERIAL_CATEGORY_LABELS
          ] ?? row.original.category}
        </span>
      ),
    },
    {
      accessorKey: 'stockOnHand',
      header: () => <span className="block text-right">Stock</span>,
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const m = row.original;
        const unitSuffix = UNIT_SUFFIX[m.unit];
        const stock = parseFloat(m.stockOnHand);
        const reorder = parseFloat(m.reorderLevel);
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="tabular-nums">
              {formatMeasure(m.stockOnHand, unitSuffix)}
            </span>
            <StockBadge stock={stock} reorderLevel={reorder} />
          </div>
        );
      },
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
      id: 'actions',
      cell: ({ row }) => {
        const m = row.original;
        return (
          <DataTableRowActions
            actions={[
              {
                label: 'View',
                icon: Eye,
                href: `/materials/${m.id}`,
              },
              {
                label: 'Edit',
                icon: Pencil,
                href: `/materials/${m.id}/edit`,
              },
              { type: 'separator' },
              {
                label: 'Adjust stock',
                icon: PackagePlus,
                href: `/inventory/${m.id}`,
              },
              { type: 'separator' },
              {
                label: 'Delete',
                icon: Trash,
                variant: 'destructive',
                onClick: () => setDeleteTarget(m),
              },
            ]}
          />
        );
      },
    },
  ];

  const deleteName = deleteTarget
    ? deleteTarget.color
      ? `${deleteTarget.name} (${deleteTarget.color})`
      : deleteTarget.name
    : '';

  return (
    <>
      <DataTable columns={columns} data={data} />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete material"
        description={`Are you sure you want to delete "${deleteName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
