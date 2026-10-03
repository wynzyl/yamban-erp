import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { formatDate } from '@yamban/shared';
import { apiFetch } from '@/lib/api';
import { DashboardStats } from './dashboard-stats';

export const metadata: Metadata = { title: 'Dashboard' };

interface DashboardCounts {
  design: { pending: number; ready: number };
  printing: number;
  heatPress: number;
  sewing: number;
  ready: number;
}

export default async function DashboardPage() {
  const counts = await apiFetch<DashboardCounts>('/production/dashboard');

  const totalActive =
    counts.design.pending +
    counts.design.ready +
    counts.printing +
    counts.heatPress +
    counts.sewing;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">{formatDate(new Date())}</p>

      {/* Production Overview */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-medium">Production</h2>
        <DashboardStats counts={counts} />
      </section>

      {/* Quick Actions */}
      {totalActive === 0 && (
        <Surface className="mt-8">
          <SurfaceBody className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <p>No active jobs. Create an order to get started.</p>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/customers/new">Add customer</Link>
              </Button>
              <Button asChild>
                <Link href="/orders">New order</Link>
              </Button>
            </div>
          </SurfaceBody>
        </Surface>
      )}
    </div>
  );
}
