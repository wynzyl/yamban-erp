import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate, formatMeasure, UNIT_SUFFIX, type StockUnit } from '@yamban/shared';
import { ArrowRight, Package, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { DashboardStats } from './dashboard-stats';

export const metadata: Metadata = { title: 'Dashboard' };

interface DashboardCounts {
  design: { pending: number; ready: number };
  printing: number;
  heatPress: number;
  sewing: number;
  packaging: number;
  ready: number;
}

interface StockRow {
  id: string;
  name: string;
  color: string | null;
  category: string;
  unit: StockUnit;
  stockOnHand: string;
  availableQuantity: string;
  reorderLevel: string | null;
}

interface ExpenseSummary {
  total: string;
  byCategory: Record<string, string>;
}

interface ExpenseResponse {
  items: unknown[];
  summary: ExpenseSummary;
  total: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function DashboardPage() {
  const month = getCurrentMonth();

  // Fetch all dashboard data in parallel
  const [counts, stockData, expenseData] = await Promise.all([
    apiFetch<DashboardCounts>('/production/dashboard'),
    apiFetch<StockRow[]>('/inventory/stock'),
    apiFetch<ExpenseResponse>(`/expenses?month=${month}&pageSize=10`),
  ]);

  const totalActive =
    counts.design.pending +
    counts.design.ready +
    counts.printing +
    counts.heatPress +
    counts.sewing +
    counts.packaging;

  // Find low stock materials (available < reorder level)
  const lowStockItems = stockData.filter((item) => {
    if (!item.reorderLevel) return false;
    return parseFloat(item.availableQuantity) < parseFloat(item.reorderLevel);
  });

  // Find out of stock materials
  const outOfStockItems = stockData.filter(
    (item) => parseFloat(item.availableQuantity) <= 0,
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">{formatDate(new Date())}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/customers/new">Add customer</Link>
          </Button>
          <Button asChild>
            <Link href="/orders/new">
              <Plus className="size-4" />
              New order
            </Link>
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium">This month</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Expenses */}
          <Surface>
            <SurfaceBody className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  <Money value={expenseData.summary.total} negativeIsProblem={false} />
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{formatMonthLabel(month)}</p>
              </div>
              <TrendingDown className="size-5 text-muted-foreground" />
            </SurfaceBody>
          </Surface>

          {/* Active Jobs */}
          <Surface>
            <SurfaceBody className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active jobs</p>
                <p className="mt-1 font-display text-2xl font-semibold">{totalActive}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {counts.ready} ready for pickup
                </p>
              </div>
              <Package className="size-5 text-muted-foreground" />
            </SurfaceBody>
          </Surface>

          {/* Stock Alerts */}
          <Surface>
            <SurfaceBody className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock alerts</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {outOfStockItems.length + lowStockItems.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {outOfStockItems.length > 0 ? (
                    <span className="text-destructive">{outOfStockItems.length} out of stock</span>
                  ) : lowStockItems.length > 0 ? (
                    <span className="text-partial-text">{lowStockItems.length} running low</span>
                  ) : (
                    'All materials healthy'
                  )}
                </p>
              </div>
              <TrendingUp className="size-5 text-muted-foreground" />
            </SurfaceBody>
          </Surface>
        </div>
      </section>

      {/* Production Overview */}
      <section className="mt-8">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Production</h2>
          <Link
            href="/production/design"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View boards
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <DashboardStats counts={counts} />
      </section>

      {/* Low Stock Materials */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Stock alerts</h2>
            <Link
              href="/inventory"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View inventory
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <Surface className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium">Material</th>
                  <th className="px-5 py-3 text-right font-medium">Available</th>
                  <th className="px-5 py-3 text-right font-medium">Reorder at</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...outOfStockItems, ...lowStockItems].slice(0, 5).map((item) => {
                  const isOut = parseFloat(item.availableQuantity) <= 0;
                  const suffix = UNIT_SUFFIX[item.unit];
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <Link
                          href={`/inventory/${item.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {item.name}
                          {item.color && (
                            <span className="ml-1 text-muted-foreground">({item.color})</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="yb-measure">
                          {formatMeasure(item.availableQuantity, suffix)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {item.reorderLevel ? (
                          <span className="yb-measure">
                            {formatMeasure(item.reorderLevel, suffix)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isOut ? (
                          <span className="inline-flex h-6 items-center rounded-control bg-destructive px-2 text-xs font-medium text-destructive-foreground">
                            Out of stock
                          </span>
                        ) : (
                          <span className="inline-flex h-6 items-center rounded-control bg-partial px-2 text-xs font-medium text-partial-foreground">
                            Low stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {outOfStockItems.length + lowStockItems.length > 5 && (
              <div className="border-t border-border px-5 py-3">
                <Link
                  href="/inventory"
                  className="text-sm text-primary hover:underline"
                >
                  View all {outOfStockItems.length + lowStockItems.length} alerts
                </Link>
              </div>
            )}
          </Surface>
        </section>
      )}

      {/* Empty State */}
      {totalActive === 0 && outOfStockItems.length === 0 && lowStockItems.length === 0 && (
        <Surface className="mt-8">
          <SurfaceBody className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              No active jobs and no stock alerts. Create an order to get started.
            </p>
            <Button asChild>
              <Link href="/orders/new">New order</Link>
            </Button>
          </SurfaceBody>
        </Surface>
      )}
    </div>
  );
}
