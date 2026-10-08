import {
  formatDate,
  formatMoney,
  PRODUCTION_STAGE_LABELS,
  type OrderStatus,
  type Paginated,
  type ProductionStage,
} from '@yamban/shared';
import { ClipboardList, Download, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PaymentChip, paymentTier } from '@/components/domain/payment-chip';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
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
  /** Current production stage, if in production */
  productionStage: ProductionStage | null;
  total: string;
  paidAmount: string;
  itemCount: number;
  /** Days overdue if released/past due with balance */
  daysOverdue?: number;
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
      <PageHeader title="Orders">
        <Button variant="outline" asChild>
          <Link href="/orders/export">
            <Download className="size-4" />
            Export
          </Link>
        </Button>
        <Button asChild>
          <Link href="/orders/new">
            <Plus className="size-4" />
            New order
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <OrderSearch
          defaultSearch={search}
          defaultPaymentFilter={payment}
          defaultStatus={status}
          showingCount={data.items.length}
          totalCount={data.total}
        />
      </div>

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
                <TableHead className="uppercase text-xs tracking-wide">Order</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">Customer</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">Stage</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">Date</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">Due</TableHead>
                <TableHead className="uppercase text-xs tracking-wide text-right">Balance</TableHead>
                <TableHead className="uppercase text-xs tracking-wide text-right">Total</TableHead>
                <TableHead className="uppercase text-xs tracking-wide">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((o) => {
                const total = Number(o.total);
                const paid = Number(o.paidAmount);
                const balance = total - paid;
                const tier = paymentTier(total, paid, o.daysOverdue ?? 0);

                // Determine balance text color per guideline
                const balanceColorClass =
                  tier === 'overdue'
                    ? 'text-destructive'
                    : balance > 0
                      ? 'text-partial-text'
                      : 'text-foreground';

                return (
                  <TableRow key={o.id} className="group">
                    {/* Order number - links to detail */}
                    <TableCell>
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-display text-[15px] font-semibold text-primary hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </TableCell>

                    {/* Customer - name as entered, item count below */}
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {o.organizationName || `${o.customerFirstName} ${o.customerLastName}`.trim()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </TableCell>

                    {/* Stage - shows specific stage when filtered by IN_PRODUCTION */}
                    <TableCell>
                      {o.status === 'RELEASED' ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="size-1.5 rounded-full bg-primary" />
                          <span className="font-medium text-primary">Released</span>
                        </span>
                      ) : o.status === 'READY' || o.productionStage === 'PACKAGING' ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="size-1.5 rounded-full bg-primary" />
                          <span className="font-medium text-primary">Ready</span>
                        </span>
                      ) : o.productionStage ? (
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className="size-1.5 rounded-full bg-primary" />
                          <span className="font-medium text-primary">
                            {status === 'IN_PRODUCTION'
                              ? PRODUCTION_STAGE_LABELS[o.productionStage]
                              : 'Production'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Order Date */}
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(o.orderDate)}
                    </TableCell>

                    {/* Due Date */}
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {o.dueDate ? formatDate(o.dueDate) : '—'}
                    </TableCell>

                    {/* Balance - heaviest figure, right-aligned */}
                    <TableCell className="text-right">
                      <span className={cn('yb-money text-[17px] font-semibold', balanceColorClass)}>
                        {formatMoney(balance)}
                      </span>
                    </TableCell>

                    {/* Total - secondary, right-aligned */}
                    <TableCell className="text-right">
                      <span className="yb-money text-muted-foreground">{formatMoney(total)}</span>
                    </TableCell>

                    {/* Payment chip */}
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total > 0 && <>Page {data.page} of {totalPages}</>}
        </p>
        <Pagination currentPage={data.page} totalPages={totalPages} getPageUrl={getPageUrl} />
      </div>
    </div>
  );
}
