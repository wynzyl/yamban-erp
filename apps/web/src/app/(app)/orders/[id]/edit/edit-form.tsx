'use client';

import { ORDER_STATUS_LABELS, updateOrderSchema, type OrderStatus } from '@yamban/shared';
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

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  dueDate: string | null;
  discount: string;
  notes: string | null;
}

interface EditOrderFormProps {
  order: OrderData;
}

// Valid status transitions (matching the API logic)
const validTransitions: Record<string, string[]> = {
  QUOTATION: ['QUOTATION', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CONFIRMED', 'IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['IN_PRODUCTION', 'READY', 'CANCELLED'],
  READY: ['READY', 'RELEASED', 'IN_PRODUCTION'],
  RELEASED: ['RELEASED'],
  CANCELLED: ['CANCELLED'],
};

export function EditOrderForm({ order }: EditOrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const allowedStatuses = validTransitions[order.status] || [order.status];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const form = new FormData(e.currentTarget);
    const data = {
      dueDate: form.get('dueDate') as string,
      discount: form.get('discount') as string,
      notes: form.get('notes') as string,
      status: form.get('status') as string,
    };

    // Only include status if changed
    if (data.status === order.status) {
      delete (data as { status?: string }).status;
    }

    const result = updateOrderSchema.safeParse(data);
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

    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    if (res.ok) {
      startTransition(() => router.push(`/orders/${order.id}`));
    } else {
      const err = await res.json().catch(() => ({}));
      setErrors({ form: err.message || 'Failed to update order.' });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="grid gap-6">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={order.status}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {ORDER_STATUS_LABELS[status as OrderStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              type="date"
              id="dueDate"
              name="dueDate"
              defaultValue={order.dueDate ?? ''}
            />
            {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate}</p>}
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input
              type="text"
              inputMode="decimal"
              id="discount"
              name="discount"
              placeholder="0.00"
              defaultValue={order.discount}
            />
            {errors.discount && <p className="text-sm text-destructive">{errors.discount}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Optional notes..."
              defaultValue={order.notes ?? ''}
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
