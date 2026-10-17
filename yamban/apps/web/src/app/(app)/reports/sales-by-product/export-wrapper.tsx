'use client';

import type { SalesByProductRow } from '@yamban/shared';
import { formatMoney } from '@yamban/shared';
import { ExportButton } from '@/components/reports/export-button';

interface ExportWrapperProps {
  data: SalesByProductRow[];
  dateRange: string;
  totalRevenue: string;
}

export function ExportWrapper({ data, dateRange, totalRevenue }: ExportWrapperProps) {
  const columns = [
    { header: 'Product', accessor: 'productName' as const },
    { header: 'Quantity Sold', accessor: 'quantitySold' as const },
    { header: 'Revenue', accessor: (r: Record<string, unknown>) => formatMoney(r.revenue as string) },
    {
      header: '% of Total',
      accessor: (r: Record<string, unknown>) => {
        const total = parseFloat(totalRevenue);
        const rowRevenue = parseFloat(r.revenue as string);
        const percent = total > 0 ? (rowRevenue / total) * 100 : 0;
        return `${percent.toFixed(1)}%`;
      },
    },
  ];

  return (
    <ExportButton
      data={data as unknown as Record<string, unknown>[]}
      columns={columns}
      filename={`sales-by-product-${dateRange}`}
    />
  );
}
