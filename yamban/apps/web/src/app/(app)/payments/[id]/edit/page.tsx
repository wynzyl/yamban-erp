import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { EditPaymentForm } from './edit-form';

export const metadata: Metadata = { title: 'Edit payment' };

interface PaymentDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  paymentDate: string;
  amount: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let payment: PaymentDetail;
  try {
    payment = await apiFetch<PaymentDetail>(`/payments/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <Link
          href={`/payments/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to payment
        </Link>
      </div>

      <PageHeader title="Edit payment" />

      <div className="mt-6">
        <EditPaymentForm payment={payment} />
      </div>
    </div>
  );
}
