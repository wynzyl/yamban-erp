import { formatDate, formatMobile, formatMoney, type Paginated } from '@yamban/shared';
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
import { CustomerFilters } from './customer-filters';
import { SortableHeader } from './sortable-header';

export const metadata: Metadata = { title: 'Customers' };

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

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    municipality?: string;
  }>;
}) {
  const { search = '', page = '1', sortBy, sortOrder, municipality } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  if (sortBy) qs.set('sortBy', sortBy);
  if (sortOrder) qs.set('sortOrder', sortOrder);
  if (municipality) qs.set('municipality', municipality);
  const data = await apiFetch<Paginated<CustomerRow>>(`/customers?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    if (municipality) params.set('municipality', municipality);
    params.set('page', String(p));
    return `?${params}`;
  }

  const hasFilters = search || municipality;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Customers" count={data.total}>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="size-4" />
            Add customer
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <CustomerFilters defaultSearch={search} defaultMunicipality={municipality} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Users className="size-10" strokeWidth={1.5} />}
            message={hasFilters ? 'No customers match your filters.' : 'No customers yet.'}
            action={hasFilters ? 'Try different search terms or filters.' : 'Add the first one to get started.'}
          >
            {!hasFilters && (
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
                <TableHead>
                  <SortableHeader sortKey="name" currentSort={sortBy} currentOrder={sortOrder}>
                    Name
                  </SortableHeader>
                </TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>
                  <SortableHeader sortKey="location" currentSort={sortBy} currentOrder={sortOrder}>
                    Location
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader sortKey="balance" currentSort={sortBy} currentOrder={sortOrder} className="justify-end">
                    Account
                  </SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader sortKey="createdAt" currentSort={sortBy} currentOrder={sortOrder} className="justify-end">
                    Added
                  </SortableHeader>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => {
                const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ');
                const hasBalance = parseFloat(c.outstandingBalance) > 0;
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
                    <TableCell className="whitespace-nowrap text-right">
                      {c.orderCount > 0 ? (
                        <div>
                          <span className="text-muted-foreground">{c.orderCount} order{c.orderCount !== 1 ? 's' : ''}</span>
                          {hasBalance && (
                            <div className="yb-money text-sm font-medium text-partial-text">
                              {formatMoney(c.outstandingBalance)} due
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
