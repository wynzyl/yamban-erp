'use client';

import {
  createPaymentSchema,
  formatMoney,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '@yamban/shared';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PaymentChip, paymentTier } from './payment-chip';

export interface OrderForPayment {
  id: string;
  orderNumber: string;
  total: string | number;
  paidAmount: string | number;
  daysOverdue?: number;
}

interface CollectPaymentModalProps {
  order: OrderForPayment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Payment collection modal — records a payment against an order.
 *
 * Design notes:
 * - Balance is the hero, displayed largest
 * - Live preview of status change (unpaid → partial → paid)
 * - Quick-fill buttons for common amounts
 * - Minimal motion per Yamban guidelines
 */
export function CollectPaymentModal({
  order,
  open,
  onOpenChange,
  onSuccess,
}: CollectPaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(today);

  // Computed values
  const total = Number(order.total);
  const paidAmount = Number(order.paidAmount);
  const balance = total - paidAmount;
  const enteredAmount = parseFloat(amount) || 0;
  const newBalance = Math.max(0, balance - enteredAmount);
  const newPaidAmount = paidAmount + enteredAmount;

  // Payment status tiers
  const currentTier = paymentTier(total, paidAmount, order.daysOverdue ?? 0);
  const previewTier = paymentTier(total, newPaidAmount, 0);
  const statusWillChange = enteredAmount > 0 && currentTier !== previewTier;

  // Quick-fill amounts
  const quickAmounts = useMemo(() => {
    const amounts: { label: string; value: number }[] = [];

    // Full balance is always first
    if (balance > 0) {
      amounts.push({ label: 'Full balance', value: balance });
    }

    // Common round amounts that make sense for this balance
    const roundAmounts = [500, 1000, 2000, 5000, 10000];
    for (const amt of roundAmounts) {
      if (amt < balance && amt >= 500) {
        amounts.push({ label: formatMoney(amt), value: amt });
      }
      if (amounts.length >= 4) break;
    }

    return amounts;
  }, [balance]);

  const resetForm = useCallback(() => {
    setAmount('');
    setMethod('CASH');
    setReference('');
    setNotes('');
    setPaymentDate(today);
    setErrors({});
  }, [today]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetForm();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    // Prevent payment if balance is zero
    if (balance <= 0) {
      setErrors({ form: 'This order is already fully paid.' });
      return;
    }

    const data = {
      orderId: order.id,
      paymentDate,
      amount,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
    };

    const result = createPaymentSchema.safeParse(data);
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

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (res.ok) {
      startTransition(() => {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
        router.refresh();
      });
    } else {
      const err = await res.json().catch(() => ({}));
      if (err.fieldErrors) {
        const fieldErrs: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.fieldErrors)) {
          if (Array.isArray(messages) && messages.length > 0) {
            fieldErrs[field] = messages[0] as string;
          }
        }
        setErrors({ ...fieldErrs, form: err.message });
      } else {
        setErrors({ form: err.message || 'Failed to record payment.' });
      }
    }
  }

  const isValidAmount = enteredAmount > 0 && enteredAmount <= balance;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-semibold tracking-tight">
            Record payment
          </DialogTitle>
          <DialogDescription>
            Order{' '}
            <span className="font-display font-semibold text-foreground">
              {order.orderNumber}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Hero: Balance display */}
          <div className="rounded-surface border border-border bg-muted/50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Balance due
                </p>
                <p className="yb-money mt-1 text-3xl font-semibold text-foreground">
                  {formatMoney(balance)}
                </p>
              </div>
              <PaymentChip
                total={total}
                paid={paidAmount}
                daysOverdue={order.daysOverdue ?? 0}
              />
            </div>

            {/* Total context */}
            <p className="mt-3 text-sm text-muted-foreground">
              Total{' '}
              <span className="yb-money">{formatMoney(total)}</span>
              {' · '}
              Paid{' '}
              <span className="yb-money">{formatMoney(paidAmount)}</span>
            </p>
          </div>

          {/* Quick-fill buttons */}
          {quickAmounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value.toFixed(2))}
                  className={`
                    rounded-control border px-3 py-1.5 text-sm font-medium transition-colors
                    ${
                      parseFloat(amount) === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="collect-amount">
              Amount <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₱
              </span>
              <Input
                type="text"
                inputMode="decimal"
                id="collect-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 yb-money"
                aria-invalid={!!errors.amount}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount}</p>
            )}
          </div>

          {/* Preview: New balance after payment */}
          {enteredAmount > 0 && (
            <div className="flex items-center justify-between rounded-control border border-border bg-card px-3 py-2">
              <span className="text-sm text-muted-foreground">
                {newBalance === 0 ? 'Fully paid' : 'New balance'}
              </span>
              <div className="flex items-center gap-2">
                <span className="yb-money font-medium">
                  {formatMoney(newBalance)}
                </span>
                {statusWillChange && (
                  <PaymentChip
                    total={total}
                    paid={newPaidAmount}
                    daysOverdue={0}
                    className="scale-90"
                  />
                )}
              </div>
            </div>
          )}

          {/* Payment method */}
          <div className="space-y-2">
            <Label htmlFor="collect-method">
              Method <span className="text-destructive">*</span>
            </Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger id="collect-method">
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
            {errors.method && (
              <p className="text-sm text-destructive">{errors.method}</p>
            )}
          </div>

          {/* Payment date */}
          <div className="space-y-2">
            <Label htmlFor="collect-date">Date</Label>
            <Input
              type="date"
              id="collect-date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={today}
            />
            {errors.paymentDate && (
              <p className="text-sm text-destructive">{errors.paymentDate}</p>
            )}
          </div>

          {/* Reference (collapsed by default via details) */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              Add reference or notes
            </summary>
            <div className="mt-3 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="collect-reference">Reference number</Label>
                <Input
                  type="text"
                  id="collect-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Transaction ID, check number..."
                />
                {errors.reference && (
                  <p className="text-sm text-destructive">{errors.reference}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="collect-notes">Notes</Label>
                <Textarea
                  id="collect-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional notes..."
                />
                {errors.notes && (
                  <p className="text-sm text-destructive">{errors.notes}</p>
                )}
              </div>
            </div>
          </details>

          {/* Form-level error */}
          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isValidAmount}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Recording...
                </>
              ) : (
                'Record payment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
