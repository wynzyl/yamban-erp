import { formatMoney, type OrderStatus, type Paginated } from '@yamban/shared';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Costing' };

interface OrderCostSummary {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  revenue: string;
  materialCost: string;
  electricityCost: string;
  totalCost: string;
  profit: string;
  marginPercent: string;
}

export default async function CostingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = '1' } = await searchParams;
  const data = await apiFetch<Paginated<OrderCostSummary>>(`/costing/orders?page=${page}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="max-w-6xl">
      <PageHeader title="Order profitability" count={data.total} />

      <Surface className="mt-6 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((order) => {
              const profit = parseFloat(order.profit);
              const margin = parseFloat(order.marginPercent);
              const isProfitable = profit >= 0;

              return (
                <TableRow key={order.orderId}>
                  <TableCell>
                    <Link
                      href={`/costing/${order.orderId}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.orderDate).toLocaleDateString('en-PH')}
                    </p>
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(order.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(order.totalCost)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className={isProfitable ? 'text-success' : 'text-destructive'}>
                      {formatMoney(order.profit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={margin >= 30 ? 'success' : margin >= 15 ? 'warning' : 'destructive'}
                      className="tabular-nums"
                    >
                      {isProfitable ? (
                        <TrendingUp className="mr-1 size-3" />
                      ) : (
                        <TrendingDown className="mr-1 size-3" />
                      )}
                      {margin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
        <Pagination
          currentPage={data.page}
          totalPages={totalPages}
          getPageUrl={(p) => `?page=${p}`}
        />
      </div>
    </div>
  );
}
