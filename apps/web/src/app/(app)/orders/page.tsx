import {
  formatDate,
  formatMoney,
  PRODUCTION_STAGE_LABELS,
  type OrderStatus,
  type Paginated,
  type ProductionStage,
} from '@yamban/shared';
import { ClipboardList, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { PaymentChip, paymentTier } from '@/components/domain/payment-chip';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { OrderSearch } from './order-search';

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
  searchParams: Promise<{ search?: string; payment?: string; status?: string; page?: string }>;
}) {
  const { search = '', payment = '', status = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  if (payment) qs.set('payment', payment);
  if (status) qs.set('status', status);
  const data = await apiFetch<Paginated<OrderRow>>(`/orders?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  // Compute summary from current page (for visual context)
  const summary = computeSummary(data.items);

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (payment) params.set('payment', payment);
    if (status) params.set('status', status);
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((o) => {
                const total = Number(o.total);
                const paid = Number(o.paidAmount);
                const balance = total - paid;
                const tier = paymentTier(total, paid, o.daysOverdue ?? 0);

                const balanceColorClass =
                  tier === 'overdue'
                    ? 'text-destructive'
                    : balance > 0
                      ? 'text-partial-text'
                      : 'text-foreground';

                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-display text-[15px] font-semibold text-primary hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <div className="font-medium">
                        {o.organizationName || `${o.customerFirstName} ${o.customerLastName}`.trim()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <StageIndicator order={o} showDetail={status === 'IN_PRODUCTION'} />
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(o.orderDate)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {o.dueDate ? formatDate(o.dueDate) : '—'}
                    </TableCell>

                    <TableCell className="text-right">
                      <span className={cn('yb-money text-[17px] font-semibold', balanceColorClass)}>
                        {formatMoney(balance)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="yb-money text-muted-foreground">{formatMoney(total)}</span>
                    </TableCell>

                    <TableCell>
                      <PaymentChip total={o.total} paid={o.paidAmount} daysOverdue={o.daysOverdue} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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

/** Stage indicator extracted for clarity */
function StageIndicator({
  order,
  showDetail,
}: {
  order: OrderRow;
  showDetail: boolean;
}) {
  if (order.status === 'RELEASED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-success" />
        <span className="font-medium text-success">Released</span>
      </span>
    );
  }

  if (order.status === 'READY' || order.productionStage === 'PACKAGING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-primary" />
        <span className="font-medium text-primary">Ready</span>
      </span>
    );
  }

  if (order.productionStage) {
    const label = showDetail
      ? PRODUCTION_STAGE_LABELS[order.productionStage]
      : 'Production';

    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-primary" />
        <span className="font-medium text-primary">{label}</span>
      </span>
    );
  }

  if (order.status === 'CONFIRMED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-muted-foreground" />
        <span className="text-muted-foreground">Confirmed</span>
      </span>
    );
  }

  if (order.status === 'QUOTATION') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full border border-muted-foreground" />
        <span className="text-muted-foreground">Quotation</span>
      </span>
    );
  }

  if (order.status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <span className="size-2 rounded-full bg-destructive" />
        <span className="text-destructive">Cancelled</span>
      </span>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}
