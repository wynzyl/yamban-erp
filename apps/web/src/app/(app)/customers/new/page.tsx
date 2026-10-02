import type { Metadata } from 'next';
import { CustomerForm } from './customer-form';

export const metadata: Metadata = { title: 'Add customer' };

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Add customer</h1>
      <CustomerForm />
    </div>
  );
}
