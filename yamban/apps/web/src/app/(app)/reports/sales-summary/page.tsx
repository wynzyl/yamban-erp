import type { SalesSummaryReport } from '@yamban/shared';
import { formatDate } from '@yamban/shared';
import type { Metadata } from 'next';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { getDefaultDateRange } from '@/lib/date-utils';
import { ReportSummaryCard } from '@/components/reports/report-summary-card';
import { PageHeader } from '@/components/ui/page-header';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Sales summary' };

export default async function SalesSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    compareWith?: string;
  }>;
}) {
  const params = await searchParams;
  const defaults = getDefaultDateRange();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;
  const compareWith = params.compareWith ?? 'none';

  const qs = new URLSearchParams({ startDate, endDate });
  if (compareWith !== 'none') qs.set('compareWith', compareWith);

  const data = await apiFetch<SalesSummaryReport>(`/reports/sales-summary?${qs}`);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Sales summary"
        description={`${formatDate(data.startDate)} to ${formatDate(data.endDate)}`}
      />

      <div className="mt-6">
        <DateRangeFilter
          defaultStartDate={startDate}
          defaultEndDate={endDate}
          defaultCompareWith={compareWith}
          showComparison
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ReportSummaryCard label="Revenue" data={data.revenue} />
        <ReportSummaryCard label="Orders" data={data.orderCount} isMoney={false} />
        <ReportSummaryCard label="Avg order value" data={data.avgOrderValue} />
      </div>

      {data.comparisonPeriod && (
        <Surface className="mt-4">
          <SurfaceBody>
            <p className="text-sm text-muted-foreground">
              Comparing to {formatDate(data.comparisonPeriod.startDate)} to{' '}
              {formatDate(data.comparisonPeriod.endDate)}
            </p>
          </SurfaceBody>
        </Surface>
      )}
    </div>
  );
}
