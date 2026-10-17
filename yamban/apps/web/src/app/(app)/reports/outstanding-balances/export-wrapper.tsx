'use client';

import type { OutstandingBalanceRow } from '@yamban/shared';
import { formatMoney } from '@yamban/shared';
import { ExportButton } from '@/components/reports/export-button';

interface ExportWrapperProps {
  data: OutstandingBalanceRow[];
}

export function ExportWrapper({ data }: ExportWrapperProps) {
  const columns = [
    { header: 'Customer', accessor: 'customerName' as const },
    { header: 'Organization', accessor: (r: Record<string, unknown>) => (r.organizationName as string) ?? '' },
    { header: 'Orders', accessor: 'orderCount' as const },
    { header: 'Current', accessor: (r: Record<string, unknown>) => formatMoney((r.buckets as { current: string }).current) },
    { header: '1-30 days', accessor: (r: Record<string, unknown>) => formatMoney((r.buckets as { days1to30: string }).days1to30) },
    { header: '31-60 days', accessor: (r: Record<string, unknown>) => formatMoney((r.buckets as { days31to60: string }).days31to60) },
    { header: '61-90 days', accessor: (r: Record<string, unknown>) => formatMoney((r.buckets as { days61to90: string }).days61to90) },
    { header: 'Over 90 days', accessor: (r: Record<string, unknown>) => formatMoney((r.buckets as { over90: string }).over90) },
    { header: 'Total', accessor: (r: Record<string, unknown>) => formatMoney(r.totalOutstanding as string) },
  ];

  return (
    <ExportButton
      data={data as unknown as Record<string, unknown>[]}
      columns={columns}
      filename="outstanding-balances"
    />
  );
}
