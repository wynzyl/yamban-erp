import type { SalesByProductReport } from '@yamban/shared';
import { formatDate } from '@yamban/shared';
import { Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { getDefaultDateRange } from '@/lib/date-utils';
import { SimpleMetricCard } from '@/components/reports/report-summary-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
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

export const metadata: Metadata = { title: 'Sales by product' };

export default async function SalesByProductPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const params = await searchParams;
  const defaults = getDefaultDateRange();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;

  const qs = new URLSearchParams({ startDate, endDate });
  const data = await apiFetch<SalesByProductReport>(`/reports/sales-by-product?${qs}`);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Sales by product"
        description={`${formatDate(startDate)} to ${formatDate(endDate)}`}
        count={data.items.length}
      />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <DateRangeFilter
          defaultStartDate={startDate}
          defaultEndDate={endDate}
          showComparison={false}
        />
        {data.items.length > 0 && (
          <ExportWrapper
            data={data.items}
            dateRange={`${startDate}-to-${endDate}`}
            totalRevenue={data.totalRevenue}
          />
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SimpleMetricCard label="Total revenue" value={data.totalRevenue} />
        <SimpleMetricCard
          label="Total units sold"
          value={data.items.reduce((sum, i) => sum + i.quantitySold, 0)}
          isMoney={false}
        />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Package className="size-10" strokeWidth={1.5} />}
            message="No sales data for this period."
            action="Try a different date range."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">% of total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => {
                const totalRevenue = parseFloat(data.totalRevenue);
                const rowRevenue = parseFloat(row.revenue);
                const percent = totalRevenue > 0 ? (rowRevenue / totalRevenue) * 100 : 0;

                return (
                  <TableRow key={row.productId}>
                    <TableCell>
                      <Link
                        href={`/products/${row.productId}`}
                        className="text-primary hover:underline"
                      >
                        {row.productName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{row.quantitySold}</TableCell>
                    <TableCell className="text-right">
                      <Money value={row.revenue} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {percent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
