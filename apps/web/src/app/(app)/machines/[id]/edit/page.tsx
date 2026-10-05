import type { ProductionStage } from '@yamban/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { MachineForm } from '../../new/machine-form';

export const metadata: Metadata = { title: 'Edit machine' };

interface MachineDetail {
  id: string;
  name: string;
  stage: ProductionStage;
  powerKw: string;
  active: boolean;
}

export default async function EditMachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let machine: MachineDetail;
  try {
    machine = await apiFetch<MachineDetail>(`/machines/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Edit machine</h1>
      <MachineForm initialData={machine} />
    </div>
  );
}
