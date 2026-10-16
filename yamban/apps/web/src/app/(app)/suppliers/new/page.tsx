import type { Metadata } from 'next';
import { SupplierForm } from './supplier-form';

export const metadata: Metadata = { title: 'Add supplier' };

export default function NewSupplierPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Add supplier</h1>
      <SupplierForm />
    </div>
  );
}
