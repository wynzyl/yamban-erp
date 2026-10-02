import { formatDate, formatMoney, type OrderStatus, type Paginated } from '@yamban/shared';
import { ClipboardList, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PaymentChip } from '@/components/domain/payment-chip';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { OrderSearch } from './order-search';
import { StatusBadge } from './status-badge';

export const metadata: Metadata = { title: 'Orders' };

interface OrderRow {
  id: string;
  orderNumber: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  organizationName: string | null;
  orderDate: string;
  dueDate: string | null;
  status: OrderStatus;
  total: string;
  paidAmount: string;
  itemCount: number;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const { search = '', status = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);
  const data = await apiFetch<Paginated<OrderRow>>(`/orders?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(p));
    return `?${params}`;
  }

  return (
    <div className="max-w-6xl">
      <PageHeader title="Orders" count={data.total}>
        <Button asChild>
          <Link href="/orders/new">
            <Plus className="size-4" />
            New order
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <OrderSearch defaultSearch={search} defaultStatus={status} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-10" strokeWidth={1.5} />}
            message={search || status ? 'No orders match the filters.' : 'No orders yet.'}
            action={search || status ? 'Try different filters.' : 'Create the first one to get started.'}
          >
            {!search && !status && (
              <Button asChild size="sm">
                <Link href="/orders/new">New order</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((o) => {
                const fullName = [o.customerFirstName, o.customerLastName].filter(Boolean).join(' ');
                return (
                  <TableRow key={o.id} className="group">
                    <TableCell>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                      <span className="ml-2 text-muted-foreground">
                        ({o.itemCount} {o.itemCount === 1 ? 'item' : 'items'})
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground">{fullName}</span>
                      {o.organizationName && (
                        <span className="ml-1 text-muted-foreground">({o.organizationName})</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(o.orderDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {o.dueDate ? formatDate(o.dueDate) : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="yb-money">{formatMoney(o.total)}</span>
                    </TableCell>
                    <TableCell>
                      <PaymentChip total={o.total} paid={o.paidAmount} />
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
