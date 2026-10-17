import { EXPENSE_CATEGORY_LABELS, type ExpenseBreakdownReport } from '@yamban/shared';
import { formatDate } from '@yamban/shared';
import { Receipt } from 'lucide-react';
import type { Metadata } from 'next';
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
import { GroupBySelect } from './group-by-select';

export const metadata: Metadata = { title: 'Expense breakdown' };

export default async function ExpenseBreakdownPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }>;
}) {
  const params = await searchParams;
  const defaults = getDefaultDateRange();
  const startDate = params.startDate ?? defaults.startDate;
  const endDate = params.endDate ?? defaults.endDate;
  const groupBy = params.groupBy ?? 'category';

  const qs = new URLSearchParams({ startDate, endDate, groupBy });
  const data = await apiFetch<ExpenseBreakdownReport>(`/reports/expense-breakdown?${qs}`);

  const groupByLabel =
    groupBy === 'category' ? 'Category' : groupBy === 'supplier' ? 'Supplier' : 'Month';

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Expense breakdown"
        description={`${formatDate(startDate)} to ${formatDate(endDate)}`}
      />

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <DateRangeFilter
          defaultStartDate={startDate}
          defaultEndDate={endDate}
          showComparison={false}
        />
        <GroupBySelect defaultValue={groupBy} />
        {data.items.length > 0 && (
          <ExportWrapper
            data={data.items}
            dateRange={`${startDate}-to-${endDate}`}
            groupBy={groupBy}
            grandTotal={data.grandTotal}
          />
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <SimpleMetricCard label="Total expenses" value={data.grandTotal} />
        <SimpleMetricCard label="Groups" value={data.items.length} isMoney={false} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-10" strokeWidth={1.5} />}
            message="No expenses for this period."
            action="Try a different date range."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{groupByLabel}</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">% of total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => {
                const grandTotal = parseFloat(data.grandTotal);
                const rowTotal = parseFloat(row.total);
                const percent = grandTotal > 0 ? (rowTotal / grandTotal) * 100 : 0;

                const label =
                  groupBy === 'category'
                    ? EXPENSE_CATEGORY_LABELS[row.groupLabel as keyof typeof EXPENSE_CATEGORY_LABELS] ??
                      row.groupLabel
                    : row.groupLabel;

                return (
                  <TableRow key={row.groupKey}>
                    <TableCell>{label}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">
                      <Money value={row.total} />
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
