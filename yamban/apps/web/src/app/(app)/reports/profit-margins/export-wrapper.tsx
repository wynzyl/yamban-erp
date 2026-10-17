'use client';

import type { ProfitMarginsRow } from '@yamban/shared';
import { formatDate, formatMoney } from '@yamban/shared';
import { ExportButton } from '@/components/reports/export-button';

interface ExportWrapperProps {
  data: ProfitMarginsRow[];
  dateRange: string;
}

export function ExportWrapper({ data, dateRange }: ExportWrapperProps) {
  const columns = [
    { header: 'Order #', accessor: 'orderNumber' as const },
    { header: 'Customer', accessor: 'customerName' as const },
    { header: 'Date', accessor: (r: Record<string, unknown>) => formatDate(r.orderDate as string) },
    { header: 'Revenue', accessor: (r: Record<string, unknown>) => formatMoney(r.revenue as string) },
    { header: 'Material Cost', accessor: (r: Record<string, unknown>) => formatMoney(r.materialCost as string) },
    { header: 'Labor Cost', accessor: (r: Record<string, unknown>) => formatMoney(r.laborCost as string) },
    { header: 'Overhead', accessor: (r: Record<string, unknown>) => formatMoney(r.overheadAllocation as string) },
    { header: 'Profit', accessor: (r: Record<string, unknown>) => formatMoney(r.profit as string) },
    { header: 'Margin %', accessor: (r: Record<string, unknown>) => `${(r.marginPercent as number).toFixed(1)}%` },
  ];

  return (
    <ExportButton
      data={data as unknown as Record<string, unknown>[]}
      columns={columns}
      filename={`profit-margins-${dateRange}`}
    />
  );
}
