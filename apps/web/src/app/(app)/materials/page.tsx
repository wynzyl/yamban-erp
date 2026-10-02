import { formatMeasure, type Paginated, MATERIAL_CATEGORY_LABELS, UNIT_SUFFIX, type StockUnit } from '@yamban/shared';
import { Package, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { MaterialSearch } from './material-search';
import { StockBadge } from './stock-badge';

export const metadata: Metadata = { title: 'Materials' };

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

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  const data = await apiFetch<Paginated<MaterialRow>>(`/materials?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `?${params}`;
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Materials" count={data.total}>
        <Button asChild>
          <Link href="/materials/new">
            <Plus className="size-4" />
            Add material
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <MaterialSearch defaultValue={search} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Package className="size-10" strokeWidth={1.5} />}
            message={search ? `No materials match "${search}".` : 'No materials yet.'}
            action={search ? 'Try a different search.' : 'Add the first one to get started.'}
          >
            {!search && (
              <Button asChild size="sm">
                <Link href="/materials/new">Add material</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Supplier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((m) => {
                const unitSuffix = UNIT_SUFFIX[m.unit];
                const stock = parseFloat(m.stockOnHand);
                const reorder = parseFloat(m.reorderLevel);
                return (
                  <TableRow key={m.id} className="group">
                    <TableCell>
                      <Link
                        href={`/materials/${m.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {m.name}
                        {m.color && <span className="ml-1 text-muted-foreground">({m.color})</span>}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {MATERIAL_CATEGORY_LABELS[m.category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? m.category}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="tabular-nums">{formatMeasure(m.stockOnHand, unitSuffix)}</span>
                        <StockBadge stock={stock} reorderLevel={reorder} />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.supplierName ?? '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Surface>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total > 0 && (
            <>
              Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of{' '}
              {data.total.toLocaleString()}
            </>
          )}
        </p>
        <Pagination currentPage={data.page} totalPages={totalPages} getPageUrl={getPageUrl} />
      </div>
    </div>
  );
}
