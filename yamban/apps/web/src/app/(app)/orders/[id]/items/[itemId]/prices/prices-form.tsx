'use client';

import {
  formatMoney,
  SIZE_LABELS,
  updateItemSizesSchema,
  type GarmentSize,
} from '@yamban/shared';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';

interface OrderItemSize {
  id: string;
  orderItemId: string;
  size: GarmentSize;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  quantity: number;
  subtotal: string;
  sizes: OrderItemSize[];
}

interface EditableSize {
  size: GarmentSize;
  quantity: number;
  unitPrice: string;
}

interface PricesEditFormProps {
  orderId: string;
  item: OrderItem;
  orderDiscount: string;
}

export function PricesEditForm({ orderId, item, orderDiscount }: PricesEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState(item.description ?? '');
  const [sizes, setSizes] = useState<EditableSize[]>(
    item.sizes.map((s) => ({
      size: s.size,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
    })),
  );

  function updateSize(index: number, field: 'quantity' | 'unitPrice', value: string) {
    setSizes(
      sizes.map((s, i) => {
        if (i !== index) return s;
        if (field === 'quantity') {
          return { ...s, quantity: parseInt(value) || 0 };
        }
        return { ...s, unitPrice: value };
      }),
    );
  }

  const newSubtotal = sizes.reduce(
    (sum, s) => sum + s.quantity * parseFloat(s.unitPrice || '0'),
    0,
  );
  const discount = parseFloat(orderDiscount) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data = {
      description: description || undefined,
      sizes: sizes.map((s) => ({
        size: s.size,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
      })),
    };

    const result = updateItemSizesSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid data.');
      return;
    }

    const res = await fetch(`/api/orders/${orderId}/items/${item.id}/prices`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || 'Failed to update item.');
      return;
    }

    startTransition(() => router.push(`/orders/${orderId}`));
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Optional description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block">Sizes and prices</Label>
            <div className="space-y-3">
              {sizes.map((size, index) => (
                <div key={size.size} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium">
                    {SIZE_LABELS[size.size]}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Qty"
                    className="w-20"
                    value={size.quantity || ''}
                    onChange={(e) => updateSize(index, 'quantity', e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">@</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Price"
                    className="w-28"
                    value={size.unitPrice}
                    onChange={(e) => updateSize(index, 'unitPrice', e.target.value)}
                  />
                  <span className="ml-auto text-sm yb-money">
                    {formatMoney(size.quantity * parseFloat(size.unitPrice || '0'))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      <Surface className="mt-4 p-6">
        <dl className="ml-auto w-48 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Item subtotal</dt>
            <dd className="yb-money">{formatMoney(newSubtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>Order discount</dt>
              <dd className="yb-money">{formatMoney(-discount)}</dd>
            </div>
          )}
        </dl>
      </Surface>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

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
