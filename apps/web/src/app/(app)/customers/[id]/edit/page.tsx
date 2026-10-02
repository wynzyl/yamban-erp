import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { CustomerForm } from '../../new/customer-form';

export const metadata: Metadata = { title: 'Edit customer' };

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  mobile: string | null;
  email: string | null;
  facebook: string | null;
  birthday: string | null;
  streetPurok: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  notes: string | null;
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await apiFetch<Customer>(`/customers/${id}`).catch(() => null);
  if (!customer) notFound();

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Edit {fullName}</h1>
      <CustomerForm initialData={customer} />
    </div>
  );
}
