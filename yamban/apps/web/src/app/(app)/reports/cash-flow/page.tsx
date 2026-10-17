import type { CashFlowReport } from '@yamban/shared';
import { formatDate } from '@yamban/shared';
import type { Metadata } from 'next';
import { Money } from '@/components/domain/money';
import { DateRangeFilter } from '@/components/reports/date-range-filter';
import { getDefaultDateRange } from '@/lib/date-utils';
import { ReportSummaryCard } from '@/components/reports/report-summary-card';
import { PageHeader } from '@/components/ui/page-header';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Cash flow' };

export default async function CashFlowPage({
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

  const data = await apiFetch<CashFlowReport>(`/reports/cash-flow?${qs}`);
  const netFlow = parseFloat(data.netFlow.value);
  const isNegative = netFlow < 0;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Cash flow"
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
        <ReportSummaryCard label="Payments received" data={data.paymentsIn} />
        <ReportSummaryCard label="Expenses paid" data={data.expensesOut} invertComparison />
        <Surface>
          <SurfaceBody className="py-3">
            <p className="text-sm text-muted-foreground">Net cash flow</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p
                className={cn(
                  'font-display text-2xl font-semibold',
                  isNegative && 'text-destructive',
                )}
              >
                <Money value={data.netFlow.value} />
              </p>
            </div>
            {data.netFlow.previousValue !== null && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                vs <Money value={data.netFlow.previousValue} />
              </p>
            )}
          </SurfaceBody>
        </Surface>
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
