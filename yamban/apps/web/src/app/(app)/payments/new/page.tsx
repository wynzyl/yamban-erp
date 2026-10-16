import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { PaymentForm } from './payment-form';

export const metadata: Metadata = { title: 'Record payment' };

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to payments
        </Link>
      </div>

      <PageHeader title="Record payment" />

      <div className="mt-6">
        <PaymentForm defaultOrderId={orderId} />
      </div>
    </div>
  );
}
