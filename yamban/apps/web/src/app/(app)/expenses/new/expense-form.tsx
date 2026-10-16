'use client';

import {
  createExpenseSchema,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type ExpenseCategory,
  type PaymentMethod,
} from '@yamban/shared';
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

interface SupplierOption {
  id: string;
  name: string;
}

interface OrderOption {
  id: string;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
}

interface ExpenseFormProps {
  defaultValues?: {
    id?: string;
    expenseDate?: string;
    category?: ExpenseCategory;
    amount?: string;
    paymentMethod?: PaymentMethod;
    description?: string;
    supplierId?: string | null;
    orderId?: string | null;
  };
  mode?: 'create' | 'edit';
}

export function ExpenseForm({ defaultValues, mode = 'create' }: ExpenseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Controlled state for Select components
  const [category, setCategory] = useState(defaultValues?.category ?? '');
  const [paymentMethod, setPaymentMethod] = useState(defaultValues?.paymentMethod ?? 'CASH');
  const [supplierId, setSupplierId] = useState(defaultValues?.supplierId ?? '');
  const [orderId, setOrderId] = useState(defaultValues?.orderId ?? '');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchSuppliers() {
      try {
        const res = await fetch('/api/suppliers?pageSize=100', { credentials: 'include' });
        if (res.ok) {
          const { data } = await res.json();
          setSuppliers(data.items);
        }
      } finally {
        setLoadingSuppliers(false);
      }
    }
    fetchSuppliers();
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders?pageSize=100', { credentials: 'include' });
        if (res.ok) {
          const { data } = await res.json();
          setOrders(data.items);
        }
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchOrders();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const form = new FormData(e.currentTarget);
    const data = {
      expenseDate: form.get('expenseDate') as string,
      category,
      amount: form.get('amount') as string,
      paymentMethod,
      description: form.get('description') as string,
      supplierId: supplierId || undefined,
      orderId: orderId || undefined,
    };

    const result = createExpenseSchema.safeParse(data);
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

    const url = mode === 'edit' ? `/api/expenses/${defaultValues?.id}` : '/api/expenses';
    const method = mode === 'edit' ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (res.ok) {
      const { data: expense } = await res.json();
      startTransition(() => router.push(`/expenses/${expense.id}`));
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
        setErrors({ form: err.message || 'Failed to save expense.' });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="grid gap-6">
          {/* Expense Date */}
          <div className="space-y-2">
            <Label htmlFor="expenseDate">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              id="expenseDate"
              name="expenseDate"
              defaultValue={defaultValues?.expenseDate ?? today}
              max={today}
            />
            {errors.expenseDate && (
              <p className="text-sm text-destructive">{errors.expenseDate}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {EXPENSE_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
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
              defaultValue={defaultValues?.amount ?? ''}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment method <span className="text-destructive">*</span>
            </Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger id="paymentMethod">
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
            {errors.paymentMethod && (
              <p className="text-sm text-destructive">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              name="description"
              rows={3}
              placeholder="What was this expense for?"
              defaultValue={defaultValues?.description ?? ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Supplier (optional) */}
          <div className="space-y-2">
            <Label htmlFor="supplierId">Supplier (optional)</Label>
            {loadingSuppliers ? (
              <div className="flex h-10 items-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="supplierId">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.supplierId && (
              <p className="text-sm text-destructive">{errors.supplierId}</p>
            )}
          </div>

          {/* Order (optional) */}
          <div className="space-y-2">
            <Label htmlFor="orderId">Linked order (optional)</Label>
            {loadingOrders ? (
              <div className="flex h-10 items-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger id="orderId">
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {orders.map((o) => {
                    const name = [o.customerFirstName, o.customerLastName]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <SelectItem key={o.id} value={o.id}>
                        {o.orderNumber} · {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {errors.orderId && <p className="text-sm text-destructive">{errors.orderId}</p>}
          </div>

          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
        </div>
      </Surface>

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {mode === 'edit' ? 'Saving...' : 'Recording...'}
            </>
          ) : mode === 'edit' ? (
            'Save changes'
          ) : (
            'Record expense'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
