import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { OrderForm } from './order-form';

export const metadata: Metadata = { title: 'New order' };

export default function NewOrderPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
      </div>

      <PageHeader title="New order" />

      <div className="mt-6">
        <OrderForm />
      </div>
    </div>
  );
}
