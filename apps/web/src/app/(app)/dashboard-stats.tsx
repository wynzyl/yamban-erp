import { Palette, Printer, Flame, Scissors, Box, Truck } from 'lucide-react';
import Link from 'next/link';

interface DashboardCounts {
  design: { pending: number; ready: number };
  printing: number;
  heatPress: number;
  sewing: number;
  packaging: number;
  ready: number;
}

interface DashboardStatsProps {
  counts: DashboardCounts;
}

const stages = [
  {
    key: 'design',
    label: 'Design',
    href: '/production/design',
    icon: Palette,
    getCount: (c: DashboardCounts) => c.design.pending + c.design.ready,
    getDetail: (c: DashboardCounts) =>
      `${c.design.pending} pending, ${c.design.ready} ready`,
  },
  {
    key: 'printing',
    label: 'Printing',
    href: '/production/printing',
    icon: Printer,
    getCount: (c: DashboardCounts) => c.printing,
    getDetail: () => null,
  },
  {
    key: 'heatPress',
    label: 'Heat press',
    href: '/production/heat-press',
    icon: Flame,
    getCount: (c: DashboardCounts) => c.heatPress,
    getDetail: () => null,
  },
  {
    key: 'sewing',
    label: 'Sewing',
    href: '/production/sewing',
    icon: Scissors,
    getCount: (c: DashboardCounts) => c.sewing,
    getDetail: () => null,
  },
  {
    key: 'packaging',
    label: 'Packaging',
    href: '/production/packaging',
    icon: Box,
    getCount: (c: DashboardCounts) => c.packaging,
    getDetail: () => null,
  },
  {
    key: 'ready',
    label: 'Ready for pickup',
    href: '/production/ready',
    icon: Truck,
    getCount: (c: DashboardCounts) => c.ready,
    getDetail: () => null,
  },
] as const;

export function DashboardStats({ counts }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
      {stages.map((stage) => {
        const Icon = stage.icon;
        const count = stage.getCount(counts);
        const detail = stage.getDetail(counts);

        return (
          <Link
            key={stage.key}
            href={stage.href}
            className="flex flex-col items-center rounded-surface border border-border bg-card p-4 text-center transition-colors hover:border-primary"
          >
            <Icon className="size-6 text-muted-foreground" />
            <span className="mt-2 text-2xl font-semibold">{count}</span>
            <span className="mt-1 text-sm text-muted-foreground">{stage.label}</span>
            {detail && (
              <span className="mt-1 text-xs text-muted-foreground">{detail}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
