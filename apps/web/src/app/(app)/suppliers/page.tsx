import { formatMobile, type Paginated } from '@yamban/shared';
import { Plus, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { SupplierSearch } from './supplier-search';

export const metadata: Metadata = { title: 'Suppliers' };

interface SupplierRow {
  id: string;
  name: string;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
}

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  const data = await apiFetch<Paginated<SupplierRow>>(`/suppliers?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `?${params}`;
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Suppliers" count={data.total}>
        <Button asChild>
          <Link href="/suppliers/new">
            <Plus className="size-4" />
            Add supplier
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <SupplierSearch defaultValue={search} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Truck className="size-10" strokeWidth={1.5} />}
            message={search ? `No suppliers match "${search}".` : 'No suppliers yet.'}
            action={search ? 'Try a different search.' : 'Add the first one to get started.'}
          >
            {!search && (
              <Button asChild size="sm">
                <Link href="/suppliers/new">Add supplier</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact person</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell>
                    <Link
                      href={`/suppliers/${s.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.contactPerson ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {s.mobile ? (
                      <a href={`tel:${s.mobile}`} className="hover:text-primary hover:underline">
                        {formatMobile(s.mobile)}
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.email ? (
                      <a href={`mailto:${s.email}`} className="hover:text-primary hover:underline">
                        {s.email}
                      </a>
                    ) : (
                      '—'
                    )}
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
