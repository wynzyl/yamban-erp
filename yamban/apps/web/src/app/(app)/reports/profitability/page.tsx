import { formatDate, formatMoney, type OrderStatus } from '@yamban/shared';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Money } from '@/components/domain/money';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch, getCurrentUser } from '@/lib/api';
import { ExpandableOrderRow } from './expandable-order-row';
import { ProfitabilityFilters } from './profitability-filters';

export const metadata: Metadata = { title: 'Order Profitability' };

interface OrderCostSummary {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  revenue: string;
  materialCost: string;
  electricityCost: string;
  laborCost: string;
  totalCost: string;
  profit: string;
  marginPercent: string;
  isEstimated: boolean;
  variance: string | null;
}

interface ProfitabilitySummary {
  totalRevenue: string;
  totalCost: string;
  totalProfit: string;
  avgMarginPercent: string | null;
  orderCount: number;
}

interface OrderCostListResponse {
  items: OrderCostSummary[];
  summary: ProfitabilitySummary;
  page: number;
  pageSize: number;
  total: number;
}

interface CustomerOption {
  id: string;
  firstName: string;
  lastName: string;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Get start and end dates for a month (YYYY-MM format). */
function getMonthDateRange(month: string): { startDate: string; endDate: string } {
  const [year, mon] = month.split('-').map(Number);
  const startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
  // Get last day of month
  const lastDay = new Date(year!, mon!, 0).getDate();
  const endDate = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    customerId?: string;
    search?: string;
    page?: string;
  }>;
}) {
  // Check role
  const user = await getCurrentUser();
  if (!user || user.role !== 'OWNER') {
    redirect('/');
  }

  const params = await searchParams;
  const month = params.month ?? getCurrentMonth();
  const customerId = params.customerId ?? '';
  const search = params.search ?? '';
  const page = params.page ?? '1';

  // Convert month to date range
  const { startDate, endDate } = getMonthDateRange(month);

  // Build query string
  const qs = new URLSearchParams({ startDate, endDate, page });
  if (customerId) qs.set('customerId', customerId);
  if (search) qs.set('search', search);

  // Fetch data
  const [data, customers] = await Promise.all([
    apiFetch<OrderCostListResponse>(`/costing/orders?${qs}`),
    apiFetch<CustomerOption[]>('/customers/with-orders'),
  ]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams({ month, page: String(p) });
    if (customerId) params.set('customerId', customerId);
    if (search) params.set('search', search);
    return `?${params}`;
  }

  const hasFilters = customerId || search;
  const totalProfit = parseFloat(data.summary.totalProfit);
  const avgMargin = data.summary.avgMarginPercent
    ? parseFloat(data.summary.avgMarginPercent)
    : null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Order profitability"
        count={data.summary.orderCount}
        description="Gross margin per order: revenue minus direct production cost"
      />

      <div className="mt-6">
        <ProfitabilityFilters
          defaultMonth={month}
          defaultCustomerId={customerId}
          defaultSearch={search}
          customers={customers}
        />
      </div>

      {/* Summary Panel */}
      <Surface className="mt-4 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{formatMonthLabel(month)} summary</p>
            <p className="font-display text-2xl font-semibold">
              <span className={totalProfit >= 0 ? 'text-success' : 'text-destructive'}>
                <Money value={data.summary.totalProfit} />
              </span>
              <span className="ml-2 text-base font-normal text-muted-foreground">
                gross profit
              </span>
            </p>
          </div>
          {avgMargin !== null && (
            <Badge
              variant={avgMargin >= 30 ? 'success' : avgMargin >= 15 ? 'warning' : 'destructive'}
              className="tabular-nums text-sm"
            >
              {avgMargin >= 0 ? (
                <TrendingUp className="mr-1 size-3" />
              ) : (
                <TrendingDown className="mr-1 size-3" />
              )}
              {avgMargin.toFixed(1)}% avg margin
            </Badge>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Revenue</span>
            <span className="shrink-0 text-sm tabular-nums">
              <Money value={data.summary.totalRevenue} />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Cost</span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
              <Money value={data.summary.totalCost} />
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Orders</span>
            <span className="shrink-0 text-sm tabular-nums">{data.summary.orderCount}</span>
          </div>
        </div>
      </Surface>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="size-10" strokeWidth={1.5} />}
            message={
              hasFilters
                ? 'No orders match your filters.'
                : `No orders in ${formatMonthLabel(month)}.`
            }
            action={hasFilters ? 'Try different filters.' : 'Orders will appear here once confirmed.'}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((order) => (
                <ExpandableOrderRow
                  key={order.orderId}
                  order={order}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total > 0 && (
            <>
              Showing {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} of {data.total.toLocaleString()}
            </>
          )}
        </p>
        <Pagination currentPage={data.page} totalPages={totalPages} getPageUrl={getPageUrl} />
      </div>
    </div>
  );
}
