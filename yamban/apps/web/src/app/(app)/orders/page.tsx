import {
  type OrderStatus,
  type Paginated,
  type ProductionStage,
} from '@yamban/shared';
import { ClipboardList, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { OrderSearch } from './order-search';
import { OrdersTable } from './orders-table';

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
  productionStage: ProductionStage | null;
  total: string;
  paidAmount: string;
  itemCount: number;
  daysOverdue?: number;
}

function computeSummary(orders: OrderRow[]) {
  let totalReceivable = 0;
  let overdueAmount = 0;
  let overdueCount = 0;
  let paidCount = 0;

  for (const o of orders) {
    const total = Number(o.total);
    const paid = Number(o.paidAmount);
    const balance = total - paid;

    if (balance > 0) {
      totalReceivable += balance;
      if (o.daysOverdue && o.daysOverdue > 0) {
        overdueAmount += balance;
        overdueCount++;
      }
    } else {
      paidCount++;
    }
  }

  return { totalReceivable, overdueAmount, overdueCount, paidCount };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    payment?: string;
    status?: string;
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const { search = '', payment = '', status = '', page = '1', sortBy, sortOrder } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  if (payment) qs.set('payment', payment);
  if (status) qs.set('status', status);
  if (sortBy) qs.set('sortBy', sortBy);
  if (sortOrder) qs.set('sortOrder', sortOrder);
  const data = await apiFetch<Paginated<OrderRow>>(`/orders?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  // Compute summary from current page (for visual context)
  const summary = computeSummary(data.items);

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (payment) params.set('payment', payment);
    if (status) params.set('status', status);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    params.set('page', String(p));
    return `?${params}`;
  }

  const hasFilters = search || payment || status;

  return (
    <div className="max-w-7xl">
      <PageHeader title="Orders" count={data.total}>
        <Button asChild>
          <Link href="/orders/new">
            <Plus className="size-4" />
            New order
          </Link>
        </Button>
      </PageHeader>

      {/* Summary Stats */}
      {data.total > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Surface>
            <SurfaceBody className="py-3">
              <p className="text-sm text-muted-foreground">Total orders</p>
              <p className="mt-1 font-display text-2xl font-semibold">{data.total}</p>
            </SurfaceBody>
          </Surface>
          <Surface>
            <SurfaceBody className="py-3">
              <p className="text-sm text-muted-foreground">Receivable</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                <Money value={summary.totalReceivable} negativeIsProblem={false} />
              </p>
            </SurfaceBody>
          </Surface>
          <Surface>
            <SurfaceBody className="py-3">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className={cn(
                'mt-1 font-display text-2xl font-semibold',
                summary.overdueAmount > 0 && 'text-destructive',
              )}>
                <Money value={summary.overdueAmount} negativeIsProblem={false} />
              </p>
              {summary.overdueCount > 0 && (
                <p className="mt-1 text-sm text-destructive">
                  {summary.overdueCount} {summary.overdueCount === 1 ? 'order' : 'orders'}
                </p>
              )}
            </SurfaceBody>
          </Surface>
          <Surface>
            <SurfaceBody className="py-3">
              <p className="text-sm text-muted-foreground">Paid this page</p>
              <p className="mt-1 font-display text-2xl font-semibold text-success">
                {summary.paidCount}
              </p>
            </SurfaceBody>
          </Surface>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6">
        <OrderSearch
          defaultSearch={search}
          defaultPaymentFilter={payment}
          defaultStatus={status}
          showingCount={data.items.length}
          totalCount={data.total}
        />
      </div>

      {/* Orders Table */}
      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-10" strokeWidth={1.5} />}
            message={hasFilters ? 'No orders match the filters.' : 'No orders yet.'}
            action={hasFilters ? 'Try different filters.' : 'Create the first one to get started.'}
          >
            {!hasFilters && (
              <Button asChild size="sm">
                <Link href="/orders/new">New order</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <OrdersTable data={data.items} statusFilter={status} sortBy={sortBy} sortOrder={sortOrder} />
        )}
      </Surface>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total > 0 && <>Page {data.page} of {totalPages}</>}
        </p>
        <Pagination currentPage={data.page} totalPages={totalPages} getPageUrl={getPageUrl} />
      </div>
    </div>
  );
}
