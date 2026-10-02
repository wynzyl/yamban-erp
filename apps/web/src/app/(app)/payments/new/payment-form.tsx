'use client';

import { createPaymentSchema, formatMoney, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@yamban/shared';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
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

interface OrderOption {
  id: string;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  total: string;
  paidAmount: string;
}

interface PaymentFormProps {
  defaultOrderId?: string;
}

export function PaymentForm({ defaultOrderId }: PaymentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Controlled state for Select components (Radix Select doesn't work with FormData)
  const [orderId, setOrderId] = useState(defaultOrderId ?? '');
  const [method, setMethod] = useState('CASH');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders?pageSize=100', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setOrders(data.items);
          if (defaultOrderId) {
            const order = data.items.find((o: OrderOption) => o.id === defaultOrderId);
            if (order) {
              setSelectedOrder(order);
              setOrderId(defaultOrderId);
            }
          }
        }
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchOrders();
  }, [defaultOrderId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const form = new FormData(e.currentTarget);
    const data = {
      orderId,
      paymentDate: form.get('paymentDate') as string,
      amount: form.get('amount') as string,
      method,
      reference: form.get('reference') as string,
      notes: form.get('notes') as string,
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
      const payment = await res.json();
      startTransition(() => router.push(`/payments/${payment.id}`));
    } else {
      const err = await res.json().catch(() => ({}));
      // Show field-specific errors from server validation
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

  const balance = selectedOrder
    ? parseFloat(selectedOrder.total) - parseFloat(selectedOrder.paidAmount)
    : 0;

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="grid gap-6">
          {/* Order Selection */}
          <div className="space-y-2">
            <Label htmlFor="orderId">
              Order <span className="text-destructive">*</span>
            </Label>
            {loadingOrders ? (
              <div className="flex h-10 items-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={orderId}
                onValueChange={(value) => {
                  setOrderId(value);
                  const order = orders.find((o) => o.id === value);
                  setSelectedOrder(order || null);
                }}
              >
                <SelectTrigger id="orderId">
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((order) => {
                    const name = [order.customerFirstName, order.customerLastName]
                      .filter(Boolean)
                      .join(' ');
                    const orderBalance =
                      parseFloat(order.total) - parseFloat(order.paidAmount);
                    return (
                      <SelectItem key={order.id} value={order.id}>
                        <span className="font-medium">{order.orderNumber}</span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{name}</span>
                        <span className="mx-2 text-muted-foreground">·</span>
                        <span className="yb-money">
                          Balance: {formatMoney(orderBalance)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {errors.orderId && <p className="text-sm text-destructive">{errors.orderId}</p>}
            {selectedOrder && (
              <p className="text-sm text-muted-foreground">
                Order total: <span className="yb-money">{formatMoney(selectedOrder.total)}</span>
                {' · '}
                Balance: <span className="yb-money font-medium">{formatMoney(balance)}</span>
              </p>
            )}
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
              defaultValue={today}
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
              defaultValue={balance > 0 ? balance.toFixed(2) : ''}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="method">
              Payment method <span className="text-destructive">*</span>
            </Label>
            <Select value={method} onValueChange={setMethod}>
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
            />
            {errors.reference && (
              <p className="text-sm text-destructive">{errors.reference}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Optional notes..." />
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
              Recording...
            </>
          ) : (
            'Record payment'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
