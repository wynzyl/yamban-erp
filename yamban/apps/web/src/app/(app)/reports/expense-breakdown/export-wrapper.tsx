'use client';

import { EXPENSE_CATEGORY_LABELS, type ExpenseGroupRow } from '@yamban/shared';
import { formatMoney } from '@yamban/shared';
import { ExportButton } from '@/components/reports/export-button';

interface ExportWrapperProps {
  data: ExpenseGroupRow[];
  dateRange: string;
  groupBy: string;
  grandTotal: string;
}

export function ExportWrapper({ data, dateRange, groupBy, grandTotal }: ExportWrapperProps) {
  const groupByLabel =
    groupBy === 'category' ? 'Category' : groupBy === 'supplier' ? 'Supplier' : 'Month';

  const columns = [
    {
      header: groupByLabel,
      accessor: (r: Record<string, unknown>) => {
        const label = r.groupLabel as string;
        if (groupBy === 'category') {
          return EXPENSE_CATEGORY_LABELS[label as keyof typeof EXPENSE_CATEGORY_LABELS] ?? label;
        }
        return label;
      },
    },
    { header: 'Count', accessor: 'count' as const },
    { header: 'Total', accessor: (r: Record<string, unknown>) => formatMoney(r.total as string) },
    {
      header: '% of Total',
      accessor: (r: Record<string, unknown>) => {
        const total = parseFloat(grandTotal);
        const rowTotal = parseFloat(r.total as string);
        const percent = total > 0 ? (rowTotal / total) * 100 : 0;
        return `${percent.toFixed(1)}%`;
      },
    },
  ];

  return (
    <ExportButton
      data={data as unknown as Record<string, unknown>[]}
      columns={columns}
      filename={`expense-breakdown-${groupBy}-${dateRange}`}
    />
  );
}
