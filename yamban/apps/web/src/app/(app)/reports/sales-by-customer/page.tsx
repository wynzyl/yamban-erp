import type { SalesByCustomerReport } from '@yamban/shared';
import { formatDate } from '@yamban/shared';
import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { getDefaultDateRange } from '@/lib/date-utils';
import { SimpleMetricCard } from '@/components/reports/report-summary-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { ExportWrapper } from './export-wrapper';

export const metadata: Metadata = { title: 'Sales by customer' };

export default async function SalesByCustomerPage({
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
  const data = await apiFetch<SalesByCustomerReport>(`/reports/sales-by-customer?${qs}`);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams({ startDate, endDate, page: String(p) });
    return `?${params}`;
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Sales by customer"
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

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SimpleMetricCard label="Total revenue" value={data.totalRevenue} />
        <SimpleMetricCard label="Customers" value={data.total} isMoney={false} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Users className="size-10" strokeWidth={1.5} />}
            message="No sales data for this period."
            action="Try a different date range."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => (
                <TableRow key={row.customerId}>
                  <TableCell>
                    <Link
                      href={`/customers/${row.customerId}`}
                      className="text-primary hover:underline"
                    >
                      {row.customerName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.organizationName ?? '\u2014'}
                  </TableCell>
                  <TableCell className="text-right">{row.orderCount}</TableCell>
                  <TableCell className="text-right">
                    <Money value={row.revenue} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money
                      value={row.outstandingBalance}
                      className={parseFloat(row.outstandingBalance) > 0 ? 'text-partial-text' : ''}
                    />
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
