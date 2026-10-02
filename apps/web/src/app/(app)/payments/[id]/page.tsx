import { formatDate, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@yamban/shared';
import { ArrowLeft, Edit } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { DeletePaymentButton } from './delete-button';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const payment = await apiFetch<{ orderNumber: string; paymentDate: string }>(`/payments/${id}`);
    return { title: `Payment – ${payment.orderNumber}` };
  } catch {
    return { title: 'Payment not found' };
  }
}

interface PaymentDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  paymentDate: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let payment: PaymentDetail;
  try {
    payment = await apiFetch<PaymentDetail>(`/payments/${id}`);
  } catch {
    notFound();
  }

  const customerName = [payment.customerFirstName, payment.customerLastName].filter(Boolean).join(' ');

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href="/payments"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to payments
        </Link>
      </div>

      <PageHeader title="Payment details">
        <div className="flex items-center gap-2">
          <DeletePaymentButton id={payment.id} />
          <Button asChild variant="outline">
            <Link href={`/payments/${payment.id}/edit`}>
              <Edit className="size-4" />
              Edit
            </Link>
          </Button>
        </div>
      </PageHeader>

      <Surface className="mt-6 p-6">
        <div className="mb-6 flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <Money value={payment.amount} className="text-2xl font-semibold" />
        </div>

        <dl className="space-y-4 text-sm">
          <div className="flex justify-between border-t border-border pt-4">
            <dt className="text-muted-foreground">Order</dt>
            <dd>
              <Link
                href={`/orders/${payment.orderId}`}
                className="font-medium text-primary hover:underline"
              >
                {payment.orderNumber}
              </Link>
            </dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Customer</dt>
            <dd>
              <Link
                href={`/customers/${payment.customerId}`}
                className="text-foreground hover:text-primary hover:underline"
              >
                {customerName}
              </Link>
            </dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Payment date</dt>
            <dd>{formatDate(payment.paymentDate)}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Method</dt>
            <dd>{PAYMENT_METHOD_LABELS[payment.method]}</dd>
          </div>

          {payment.reference && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-mono text-xs">{payment.reference}</dd>
            </div>
          )}

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Recorded</dt>
            <dd>{formatDate(payment.createdAt)}</dd>
          </div>
        </dl>
      </Surface>

      {payment.notes && (
        <Surface className="mt-4 p-4">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Notes</h2>
          <p className="whitespace-pre-wrap text-sm">{payment.notes}</p>
        </Surface>
      )}
    </div>
  );
}
