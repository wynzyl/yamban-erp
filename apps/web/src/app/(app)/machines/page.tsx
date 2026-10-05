import { PRODUCTION_STAGE_LABELS, type ProductionStage } from '@yamban/shared';
import { Cog, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Machines' };

interface MachineRow {
  id: string;
  name: string;
  stage: ProductionStage;
  powerKw: string;
  active: boolean;
}

export default async function MachinesPage() {
  const machines = await apiFetch<MachineRow[]>('/machines');

  // Group by stage
  const byStage = new Map<ProductionStage, MachineRow[]>();
  for (const m of machines) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Machines" count={machines.length}>
        <Button asChild>
          <Link href="/machines/new">
            <Plus className="size-4" />
            Add machine
          </Link>
        </Button>
      </PageHeader>

      {machines.length === 0 ? (
        <Surface className="mt-6">
          <EmptyState
            icon={<Cog className="size-10" strokeWidth={1.5} />}
            message="No machines configured."
            action="Add machines to track production costs."
          >
            <Button asChild size="sm">
              <Link href="/machines/new">Add machine</Link>
            </Button>
          </EmptyState>
        </Surface>
      ) : (
        <div className="mt-6 space-y-6">
          {Array.from(byStage.entries()).map(([stage, items]) => (
            <Surface key={stage} className="overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2">
                <h2 className="font-medium">{PRODUCTION_STAGE_LABELS[stage]}</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Power (kW)</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Link
                          href={`/machines/${m.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {m.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {parseFloat(m.powerKw).toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/machines/${m.id}/edit`}>Edit</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
