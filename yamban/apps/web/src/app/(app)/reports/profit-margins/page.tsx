import type { ProfitMarginsReport } from '@yamban/shared';
import { formatDate } from '@yamban/shared';
import { Calculator, AlertTriangle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { getDefaultDateRange } from '@/lib/date-utils';
import { SimpleMetricCard } from '@/components/reports/report-summary-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExportWrapper } from './export-wrapper';

export const metadata: Metadata = { title: 'Profit margins' };

export default async function ProfitMarginsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const defaults = getDefaultDateRange();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;
  const page = params.page ?? '1';

  const qs = new URLSearchParams({ startDate, endDate, page });
  const data = await apiFetch<ProfitMarginsReport>(`/reports/profit-margins?${qs}`);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams({ startDate, endDate, page: String(p) });
    return `?${params}`;
  }

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Profit margins"
        description={`${formatDate(startDate)} to ${formatDate(endDate)}`}
        count={data.total}
      />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <DateRangeFilter
          defaultStartDate={startDate}
          defaultEndDate={endDate}
          showComparison={false}
        />
        {data.items.length > 0 && (
          <ExportWrapper data={data.items} dateRange={`${startDate}-to-${endDate}`} />
        )}
      </div>

      {data.overheadNote && (
        <Surface className="mt-4 border-partial">
          <SurfaceBody className="flex items-center gap-2 py-2">
            <AlertTriangle className="size-4 text-partial-text" />
            <p className="text-sm text-partial-text">{data.overheadNote}</p>
          </SurfaceBody>
        </Surface>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <SimpleMetricCard label="Total revenue" value={data.summary.totalRevenue} />
        <SimpleMetricCard label="Total cost" value={data.summary.totalCost} />
        <SimpleMetricCard
          label="Total profit"
          value={data.summary.totalProfit}
          subtext={parseFloat(data.summary.totalProfit) < 0 ? 'Loss' : ''}
        />
        <SimpleMetricCard
          label="Avg margin"
          value={`${data.summary.avgMarginPercent.toFixed(1)}%`}
          isMoney={false}
        />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Calculator className="size-10" strokeWidth={1.5} />}
            message="No orders for this period."
            action="Try a different date range."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Material</TableHead>
                <TableHead className="text-right">Labor</TableHead>
                <TableHead className="text-right">Overhead</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => {
                const profit = parseFloat(row.profit);
                const isNegative = profit < 0;

                return (
                  <TableRow key={row.orderId}>
                    <TableCell>
                      <Link
                        href={`/orders/${row.orderId}`}
                        className="text-primary hover:underline"
                      >
                        {row.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{row.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.orderDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.revenue} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.materialCost} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.laborCost} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      <Money value={row.overheadAllocation} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money
                        value={row.profit}
                        className={cn(isNegative && 'text-destructive')}
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        isNegative && 'text-destructive',
                        !isNegative && row.marginPercent >= 20 && 'text-success',
                      )}
                    >
                      {row.marginPercent.toFixed(1)}%
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
