import type { OutstandingBalancesReport } from '@yamban/shared';
import { CreditCard } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { SimpleMetricCard } from '@/components/reports/report-summary-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Outstanding balances' };

export default async function OutstandingBalancesPage() {
  const data = await apiFetch<OutstandingBalancesReport>('/reports/outstanding-balances');

  const overdueCount = data.items.filter(
    (i) => parseFloat(i.buckets.over90) > 0 || parseFloat(i.buckets.days61to90) > 0,
  ).length;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Outstanding balances"
        description="Customers with unpaid order balances"
        count={data.items.length}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <SimpleMetricCard label="Total outstanding" value={data.grandTotal} />
        <SimpleMetricCard label="Customers" value={data.items.length} isMoney={false} />
        <SimpleMetricCard label="Overdue (60+ days)" value={overdueCount} isMoney={false} />
        <SimpleMetricCard
          label="Over 90 days"
          value={data.totals.over90}
          subtext={parseFloat(data.totals.over90) > 0 ? 'Needs follow up' : ''}
        />
      </div>

      <Surface className="mt-4">
        <SurfaceHeader>
          <SurfaceTitle>Aging summary</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Current</p>
              <p className="font-display text-lg font-semibold">
                <Money value={data.totals.current} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">1 to 30 days</p>
              <p className="font-display text-lg font-semibold">
                <Money value={data.totals.days1to30} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">31 to 60 days</p>
              <p className="font-display text-lg font-semibold">
                <Money value={data.totals.days31to60} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">61 to 90 days</p>
              <p className="font-display text-lg font-semibold text-partial-text">
                <Money value={data.totals.days61to90} />
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Over 90 days</p>
              <p className="font-display text-lg font-semibold text-destructive">
                <Money value={data.totals.over90} />
              </p>
            </div>
          </div>
        </SurfaceBody>
      </Surface>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="size-10" strokeWidth={1.5} />}
            message="No outstanding balances."
            action="All orders have been paid in full."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1 to 30</TableHead>
                <TableHead className="text-right">31 to 60</TableHead>
                <TableHead className="text-right">61 to 90</TableHead>
                <TableHead className="text-right">Over 90</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((row) => {
                const hasOverdue =
                  parseFloat(row.buckets.over90) > 0 || parseFloat(row.buckets.days61to90) > 0;

                return (
                  <TableRow key={row.customerId}>
                    <TableCell>
                      <Link
                        href={`/customers/${row.customerId}`}
                        className="text-primary hover:underline"
                      >
                        {row.customerName}
                      </Link>
                      {row.organizationName && (
                        <span className="ml-1 text-muted-foreground">
                          ({row.organizationName})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{row.orderCount}</TableCell>
                    <TableCell className="text-right">
                      <Money value={row.buckets.current} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.buckets.days1to30} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={row.buckets.days31to60} />
                    </TableCell>
                    <TableCell className="text-right text-partial-text">
                      <Money value={row.buckets.days61to90} />
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      <Money value={row.buckets.over90} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Money
                        value={row.totalOutstanding}
                        className={hasOverdue ? 'text-destructive' : 'text-partial-text'}
                      />
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
