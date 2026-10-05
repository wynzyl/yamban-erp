import type { Metadata } from 'next';
import { MachineForm } from './machine-form';

export const metadata: Metadata = { title: 'Add machine' };

export default function NewMachinePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Add machine</h1>
      <MachineForm />
    </div>
  );
}
