import { type Paginated, type StockUnit } from '@yamban/shared';
import { Package, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { MaterialSearch } from './material-search';
import { MaterialsTable } from './materials-table';

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
  searchParams: Promise<{
    search?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const { search = '', page = '1', sortBy, sortOrder } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  if (sortBy) qs.set('sortBy', sortBy);
  if (sortOrder) qs.set('sortOrder', sortOrder);
  const data = await apiFetch<Paginated<MaterialRow>>(`/materials?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
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
          <MaterialsTable data={data.items} sortBy={sortBy} sortOrder={sortOrder} />
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
