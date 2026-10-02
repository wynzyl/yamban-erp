import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody } from '@/components/ui/surface';
import { formatDate } from '@yamban/shared';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">{formatDate(new Date())}</p>

      <Surface className="mt-8">
        <SurfaceBody className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p>No orders this month yet. Record the first one.</p>
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
    </div>
  );
}
