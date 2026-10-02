import type { Paginated } from '@yamban/shared';
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
import { ProductSearch } from './product-search';

export const metadata: Metadata = { title: 'Products' };

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  sizeCount: number;
  createdAt: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  const data = await apiFetch<Paginated<ProductRow>>(`/products?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `?${params}`;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Products" count={data.total}>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="size-4" />
            Add product
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <ProductSearch defaultValue={search} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Package className="size-10" strokeWidth={1.5} />}
            message={search ? `No products match "${search}".` : 'No products yet.'}
            action={search ? 'Try a different search.' : 'Add the first one to get started.'}
          >
            {!search && (
              <Button asChild size="sm">
                <Link href="/products/new">Add product</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Sizes</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
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
                  <TableCell className="text-center tabular-nums">
                    {p.sizeCount}
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
              ))}
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
