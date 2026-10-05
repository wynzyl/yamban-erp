'use client';

import {
  editOrderSchema,
  formatMoney,
  GARMENT_SIZES,
  ORDER_STATUS_LABELS,
  SIZE_LABELS,
  type GarmentSize,
  type OrderStatus,
} from '@yamban/shared';
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2, Users } from 'lucide-react';
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

interface OrderItemSize {
  size: GarmentSize;
  quantity: number;
  unitPrice: string;
}

interface RosterEntry {
  id: string;
  orderItemId: string;
  playerName: string;
  jerseyNumber: string | null;
  size: GarmentSize;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  quantity: number;
  subtotal: string;
  sizes: OrderItemSize[];
  roster: RosterEntry[];
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  dueDate: string | null;
  discount: string;
  notes: string | null;
  items: OrderItem[];
}

interface EditableOrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: string;
  roster: { playerName: string; jerseyNumber: string; size: GarmentSize }[];
  rosterExpanded: boolean;
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

  const [status, setStatus] = useState(order.status);
  const [dueDate, setDueDate] = useState(order.dueDate ?? '');
  const [discount, setDiscount] = useState(order.discount);
  const [notes, setNotes] = useState(order.notes ?? '');
  const [items, setItems] = useState<EditableOrderItem[]>(
    order.items.map((item) => {
      // Calculate total quantity and get unit price from sizes
      const totalQuantity = item.sizes.reduce((sum, s) => sum + s.quantity, 0);
      const unitPrice = item.sizes[0]?.unitPrice || '0';
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        description: item.description ?? '',
        quantity: totalQuantity,
        unitPrice,
        roster: item.roster.map((r) => ({
          playerName: r.playerName,
          jerseyNumber: r.jerseyNumber ?? '',
          size: r.size,
        })),
        rosterExpanded: false,
      };
    }),
  );

  function updateItem(index: number, field: keyof EditableOrderItem, value: string | number) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function toggleRosterExpanded(itemIndex: number) {
    setItems(
      items.map((item, i) =>
        i === itemIndex ? { ...item, rosterExpanded: !item.rosterExpanded } : item,
      ),
    );
  }

  function addRosterEntry(itemIndex: number) {
    setItems(
      items.map((item, i) => {
        if (i !== itemIndex) return item;
        return {
          ...item,
          roster: [...item.roster, { playerName: '', jerseyNumber: '', size: 'M' as GarmentSize }],
          rosterExpanded: true,
        };
      }),
    );
  }

  function removeRosterEntry(itemIndex: number, rosterIndex: number) {
    setItems(
      items.map((item, i) => {
        if (i !== itemIndex) return item;
        return { ...item, roster: item.roster.filter((_, ri) => ri !== rosterIndex) };
      }),
    );
  }

  function updateRosterEntry(
    itemIndex: number,
    rosterIndex: number,
    field: 'playerName' | 'jerseyNumber' | 'size',
    value: string,
  ) {
    setItems(
      items.map((item, i) => {
        if (i !== itemIndex) return item;
        const newRoster = item.roster.map((r, ri) => {
          if (ri !== rosterIndex) return r;
          return { ...r, [field]: field === 'size' ? (value as GarmentSize) : value };
        });
        return { ...item, roster: newRoster };
      }),
    );
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + item.quantity * parseFloat(item.unitPrice || '0');
  }, 0);
  const discountNum = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Build items for submission
    const orderItems = items.map((item) => {
      // Count sizes from roster entries
      const sizeCounts = new Map<GarmentSize, number>();
      for (const r of item.roster) {
        if (r.playerName.trim()) {
          sizeCounts.set(r.size, (sizeCounts.get(r.size) || 0) + 1);
        }
      }

      // If roster has entries, use roster counts for sizes
      // Otherwise, create a single "ONE_SIZE" entry with full quantity
      let sizes: { size: GarmentSize; quantity: number; unitPrice: string }[];
      if (sizeCounts.size > 0) {
        sizes = Array.from(sizeCounts.entries()).map(([size, qty]) => ({
          size,
          quantity: qty,
          unitPrice: item.unitPrice,
        }));
      } else {
        sizes = [{ size: 'ONE_SIZE' as GarmentSize, quantity: item.quantity, unitPrice: item.unitPrice }];
      }

      const filteredRoster = item.roster
        .filter((r) => r.playerName.trim())
        .map((r) => ({
          playerName: r.playerName.trim(),
          jerseyNumber: r.jerseyNumber.trim() || undefined,
          size: r.size,
        }));

      return {
        id: item.id,
        productId: item.productId,
        description: item.description || undefined,
        sizes,
        roster: filteredRoster,
      };
    });

    const data = {
      dueDate: dueDate || undefined,
      discount: discount || '0',
      notes: notes || undefined,
      items: orderItems,
    };

    const result = editOrderSchema.safeParse(data);
    if (!result.success) {
      const firstError = result.error.issues[0];
      if (firstError) {
        setErrors({ form: firstError.message });
      }
      return;
    }

    // First, update items via PUT
    const res = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setErrors({ form: err.message || 'Failed to update order.' });
      return;
    }

    // If status changed, update it via PATCH
    if (status !== order.status) {
      const statusRes = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });

      if (!statusRes.ok) {
        const err = await statusRes.json().catch(() => ({}));
        setErrors({ form: err.message || 'Failed to update status.' });
        return;
      }
    }

    startTransition(() => router.push(`/orders/${order.id}`));
  }

  const allowedStatuses = validTransitions[order.status] || [order.status];

  return (
    <form onSubmit={handleSubmit}>
      {/* Order Details */}
      <Surface className="p-6">
        <h2 className="mb-4 font-medium">Order details</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_LABELS[s as OrderStatus]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input
              type="text"
              inputMode="decimal"
              id="discount"
              placeholder="0.00"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Surface>

      {/* Items */}
      <Surface className="mt-4 p-6">
        <h2 className="mb-4 font-medium">Items</h2>

        <div className="space-y-6">
          {items.map((item, itemIndex) => (
            <div key={item.id} className="rounded-lg border border-border p-4">
              <div className="mb-3">
                <h3 className="font-medium">{item.productName}</h3>
              </div>

              <div className="mb-4 space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Optional description..."
                  value={item.description}
                  onChange={(e) => updateItem(itemIndex, 'description', e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    className="w-24"
                    value={item.quantity || ''}
                    onChange={(e) => updateItem(itemIndex, 'quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit price</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    className="w-32"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(itemIndex, 'unitPrice', e.target.value)}
                  />
                </div>
                <div className="ml-auto space-y-2">
                  <Label className="text-muted-foreground">Subtotal</Label>
                  <p className="py-2 text-sm font-medium yb-money">
                    {formatMoney(item.quantity * parseFloat(item.unitPrice || '0'))}
                  </p>
                </div>
              </div>

              {/* Roster/Lineup Section */}
              <div className="mt-4 border-t border-border pt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => toggleRosterExpanded(itemIndex)}
                >
                  <div className="flex items-center gap-2">
                    {item.rosterExpanded ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                    <Users className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Roster</span>
                    {item.roster.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {item.roster.length} player{item.roster.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>

                {item.rosterExpanded && (
                  <div className="mt-3 space-y-2">
                    {item.roster.map((entry, rosterIndex) => (
                      <div key={rosterIndex} className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="Name"
                          className="flex-1"
                          value={entry.playerName}
                          onChange={(e) =>
                            updateRosterEntry(itemIndex, rosterIndex, 'playerName', e.target.value)
                          }
                        />
                        <Input
                          type="text"
                          placeholder="#"
                          className="w-16"
                          value={entry.jerseyNumber}
                          onChange={(e) =>
                            updateRosterEntry(itemIndex, rosterIndex, 'jerseyNumber', e.target.value)
                          }
                        />
                        <Select
                          value={entry.size}
                          onValueChange={(size) =>
                            updateRosterEntry(itemIndex, rosterIndex, 'size', size)
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GARMENT_SIZES.map((size) => (
                              <SelectItem key={size} value={size}>
                                {SIZE_LABELS[size]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeRosterEntry(itemIndex, rosterIndex)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addRosterEntry(itemIndex)}
                    >
                      <Plus className="size-3" />
                      Add player
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Surface>

      {/* Totals */}
      <Surface className="mt-4 p-6">
        <dl className="ml-auto w-48 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="yb-money">{formatMoney(subtotal)}</dd>
          </div>
          {discountNum > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <dt>Discount</dt>
              <dd className="yb-money">{formatMoney(-discountNum)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1 font-medium">
            <dt>Total</dt>
            <dd className="yb-money">{formatMoney(total)}</dd>
          </div>
        </dl>
      </Surface>

      {errors.form && <p className="mt-4 text-sm text-destructive">{errors.form}</p>}

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
