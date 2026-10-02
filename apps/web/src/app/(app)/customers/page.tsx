import { formatDate, formatMobile, type Paginated } from '@yamban/shared';
import { Plus, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CustomerAvatar } from '@/components/domain/customer-avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { CustomerSearch } from './customer-search';

export const metadata: Metadata = { title: 'Customers' };

interface CustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  organizationName: string | null;
  mobile: string | null;
  municipality: string | null;
  createdAt: string;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  const data = await apiFetch<Paginated<CustomerRow>>(`/customers?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `?${params}`;
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Customers" count={data.total}>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="size-4" />
            Add customer
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <CustomerSearch defaultValue={search} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Users className="size-10" strokeWidth={1.5} />}
            message={search ? `No customers match "${search}".` : 'No customers yet.'}
            action={search ? 'Try a different search.' : 'Add the first one to get started.'}
          >
            {!search && (
              <Button asChild size="sm">
                <Link href="/customers/new">Add customer</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Name</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
                return (
                  <TableRow key={c.id} className="group">
                    <TableCell className="pr-0">
                      <CustomerAvatar firstName={c.firstName} lastName={c.lastName} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {fullName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.organizationName ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.mobile ? formatMobile(c.mobile) : '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.municipality ?? '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                      {formatDate(c.createdAt)}
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
