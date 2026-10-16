import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { SupplierForm } from '../../new/supplier-form';

export const metadata: Metadata = { title: 'Edit supplier' };

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  bankDetails: string | null;
  notes: string | null;
}

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await apiFetch<Supplier>(`/suppliers/${id}`).catch(() => null);
  if (!supplier) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Edit supplier</h1>
      <SupplierForm initialData={supplier} />
    </div>
  );
}
