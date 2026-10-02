'use client';

import { PAYMENT_METHOD_LABELS, updatePaymentSchema, type PaymentMethod } from '@yamban/shared';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';

interface PaymentData {
  id: string;
  orderId: string;
  orderNumber: string;
  paymentDate: string;
  amount: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

interface EditPaymentFormProps {
  payment: PaymentData;
}

export function EditPaymentForm({ payment }: EditPaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const form = new FormData(e.currentTarget);
    const data = {
      paymentDate: form.get('paymentDate') as string,
      amount: form.get('amount') as string,
      method: form.get('method') as string,
      reference: form.get('reference') as string,
      notes: form.get('notes') as string,
    };

    const result = updatePaymentSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    const res = await fetch(`/api/payments/${payment.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    if (res.ok) {
      startTransition(() => router.push(`/payments/${payment.id}`));
    } else {
      const err = await res.json().catch(() => ({}));
      setErrors({ form: err.message || 'Failed to update payment.' });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="grid gap-6">
          {/* Order (read-only) */}
          <div className="space-y-2">
            <Label>Order</Label>
            <p className="text-sm font-medium">{payment.orderNumber}</p>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paymentDate">
              Payment date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              id="paymentDate"
              name="paymentDate"
              defaultValue={payment.paymentDate}
              max={today}
            />
            {errors.paymentDate && (
              <p className="text-sm text-destructive">{errors.paymentDate}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              id="amount"
              name="amount"
              placeholder="0.00"
              defaultValue={payment.amount}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="method">
              Payment method <span className="text-destructive">*</span>
            </Label>
            <Select name="method" defaultValue={payment.method}>
              <SelectTrigger id="method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {errors.method && <p className="text-sm text-destructive">{errors.method}</p>}
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference number</Label>
            <Input
              type="text"
              id="reference"
              name="reference"
              placeholder="Transaction ID, check number, etc."
              defaultValue={payment.reference ?? ''}
            />
            {errors.reference && (
              <p className="text-sm text-destructive">{errors.reference}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Optional notes..."
              defaultValue={payment.notes ?? ''}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
          </div>

          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}
        </div>
      </Surface>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save changes'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
