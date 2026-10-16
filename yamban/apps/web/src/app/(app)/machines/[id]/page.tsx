import { PRODUCTION_STAGE_LABELS, type ProductionStage } from '@yamban/shared';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { DeleteMachineButton } from './delete-button';

export const metadata: Metadata = { title: 'Machine' };

interface MachineDetail {
  id: string;
  name: string;
  stage: ProductionStage;
  powerKw: string;
  active: boolean;
}

export default async function MachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let machine: MachineDetail;
  try {
    machine = await apiFetch<MachineDetail>(`/machines/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/machines">
            <ArrowLeft className="size-4" />
            Back to machines
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight">{machine.name}</h1>
          <div className="mt-2">
            <Badge variant="outline">{PRODUCTION_STAGE_LABELS[machine.stage]}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/machines/${id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
          <DeleteMachineButton machineId={id} machineName={machine.name} />
        </div>
      </div>

      <Surface className="mt-6 p-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Stage</dt>
            <dd className="mt-1 font-medium">{PRODUCTION_STAGE_LABELS[machine.stage]}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Power consumption</dt>
            <dd className="mt-1 font-medium tabular-nums">{parseFloat(machine.powerKw).toFixed(3)} kW</dd>
          </div>
        </dl>
      </Surface>
    </div>
  );
}
