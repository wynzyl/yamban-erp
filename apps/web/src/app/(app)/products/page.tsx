import { formatMoney, type Paginated } from '@yamban/shared';
import { Package, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { ProductFilters } from './product-filters';
import { SortableHeader } from './sortable-header';

export const metadata: Metadata = { title: 'Products' };

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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    status?: string;
  }>;
}) {
  const { search = '', page = '1', sortBy, sortOrder, status } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  if (sortBy) qs.set('sortBy', sortBy);
  if (sortOrder) qs.set('sortOrder', sortOrder);
  if (status) qs.set('status', status);
  const data = await apiFetch<Paginated<ProductRow>>(`/products?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    if (status) params.set('status', status);
    params.set('page', String(p));
    return `?${params}`;
  }

  const hasFilters = search || status;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Products" count={data.total}>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="size-4" />
            Add product
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <ProductFilters defaultSearch={search} defaultStatus={status} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Package className="size-10" strokeWidth={1.5} />}
            message={hasFilters ? 'No products match your filters.' : 'No products yet.'}
            action={hasFilters ? 'Try different search terms or filters.' : 'Add the first one to get started.'}
          >
            {!hasFilters && (
              <Button asChild size="sm">
                <Link href="/products/new">Add product</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader sortKey="name" currentSort={sortBy} currentOrder={sortOrder}>
                    Name
                  </SortableHeader>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">
                  <SortableHeader sortKey="price" currentSort={sortBy} currentOrder={sortOrder} className="justify-end">
                    Price
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader sortKey="usage" currentSort={sortBy} currentOrder={sortOrder} className="justify-end">
                    Usage
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => {
                const hasRevenue = parseFloat(p.totalRevenue) > 0;
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={p.defaultPrice} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {p.orderCount > 0 ? (
                        <div>
                          <span className="text-muted-foreground">{p.orderCount} order{p.orderCount !== 1 ? 's' : ''}</span>
                          {hasRevenue && (
                            <div className="yb-money text-sm text-muted-foreground">
                              {formatMoney(p.totalRevenue)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex h-6 items-center rounded-control px-2 text-xs font-medium ${
                          p.active
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
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
