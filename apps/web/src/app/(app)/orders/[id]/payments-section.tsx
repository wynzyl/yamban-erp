'use client';

import { formatDate, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@yamban/shared';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CollectPaymentModal, type OrderForPayment } from '@/components/domain/collect-payment-modal';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Payment {
  id: string;
  paymentDate: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

interface PaymentsSectionProps {
  order: OrderForPayment;
  payments: Payment[];
  balance: number;
}

export function PaymentsSection({ order, payments, balance }: PaymentsSectionProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const handlePaymentSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <Surface className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium">Payments ({payments.length})</h2>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            disabled={balance <= 0}
          >
            <Plus className="size-4" />
            Record payment
          </Button>
        </div>
        {payments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(p.paymentDate)}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                  <TableCell className="text-muted-foreground">{p.reference ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Money value={p.amount} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>

      <CollectPaymentModal
        order={order}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
