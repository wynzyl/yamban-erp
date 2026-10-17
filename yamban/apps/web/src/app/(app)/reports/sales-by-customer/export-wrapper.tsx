'use client';

import type { SalesByCustomerRow } from '@yamban/shared';
import { formatMoney } from '@yamban/shared';
import { ExportButton } from '@/components/reports/export-button';

interface ExportWrapperProps {
  data: SalesByCustomerRow[];
  dateRange: string;
}

export function ExportWrapper({ data, dateRange }: ExportWrapperProps) {
  const columns = [
    { header: 'Customer', accessor: 'customerName' as const },
    { header: 'Organization', accessor: (r: Record<string, unknown>) => (r.organizationName as string) ?? '' },
    { header: 'Orders', accessor: 'orderCount' as const },
    { header: 'Revenue', accessor: (r: Record<string, unknown>) => formatMoney(r.revenue as string) },
    { header: 'Outstanding', accessor: (r: Record<string, unknown>) => formatMoney(r.outstandingBalance as string) },
  ];

  return (
    <ExportButton
      data={data as unknown as Record<string, unknown>[]}
      columns={columns}
      filename={`sales-by-customer-${dateRange}`}
    />
  );
}
