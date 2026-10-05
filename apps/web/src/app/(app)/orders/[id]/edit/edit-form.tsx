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
  id: string;
  orderItemId: string;
  size: GarmentSize;
  quantity: number;
  unitPrice: string;
  subtotal: string;
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
  sizes: { size: GarmentSize; quantity: number; unitPrice: string }[];
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
    order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      description: item.description ?? '',
      sizes: item.sizes.map((s) => ({
        size: s.size,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
      })),
      roster: item.roster.map((r) => ({
        playerName: r.playerName,
        jerseyNumber: r.jerseyNumber ?? '',
        size: r.size,
      })),
      rosterExpanded: false,
    })),
  );

  function updateItemDescription(index: number, description: string) {
    setItems(
      items.map((item, i) => (i === index ? { ...item, description } : item)),
    );
  }

  function updateItemSize(
    itemIndex: number,
    sizeIndex: number,
    field: 'quantity' | 'unitPrice',
    value: string,
  ) {
    setItems(
      items.map((item, i) => {
        if (i !== itemIndex) return item;
        const newSizes = item.sizes.map((s, si) => {
          if (si !== sizeIndex) return s;
          if (field === 'quantity') {
            return { ...s, quantity: parseInt(value) || 0 };
          }
          return { ...s, unitPrice: value };
        });
        return { ...item, sizes: newSizes };
      }),
    );
  }

  function addSizeToItem(itemIndex: number, size: GarmentSize) {
    setItems(
      items.map((item, i) => {
        if (i !== itemIndex) return item;
        if (item.sizes.some((s) => s.size === size)) return item;
        return {
          ...item,
          sizes: [...item.sizes, { size, quantity: 1, unitPrice: '0' }],
        };
      }),
    );
  }

  function removeSizeFromItem(itemIndex: number, sizeIndex: number) {
    setItems(
      items.map((item, i) => {
        if (i !== itemIndex) return item;
        return { ...item, sizes: item.sizes.filter((_, si) => si !== sizeIndex) };
      }),
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
        const defaultSize = item.sizes[0]?.size ?? 'M';
        return {
          ...item,
          roster: [...item.roster, { playerName: '', jerseyNumber: '', size: defaultSize }],
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
    return (
      sum +
      item.sizes.reduce((sizeSum, s) => {
        return sizeSum + s.quantity * parseFloat(s.unitPrice || '0');
      }, 0)
    );
  }, 0);
  const discountNum = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Build items for submission
    const orderItems = items.map((item) => {
      const filteredSizes = item.sizes
        .filter((s) => s.quantity > 0)
        .map((s) => ({
          size: s.size,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
        }));
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
        sizes: filteredSizes,
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
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      const firstError = result.error.issues[0];
      if (firstError) {
        setErrors((prev) => ({ ...prev, form: firstError.message }));
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
                  onChange={(e) => updateItemDescription(itemIndex, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sizes</Label>
                  <Select
                    onValueChange={(size) => addSizeToItem(itemIndex, size as GarmentSize)}
                  >
                    <SelectTrigger className="h-8 w-[120px]">
                      <Plus className="mr-1 size-3" />
                      <SelectValue placeholder="Add size" />
                    </SelectTrigger>
                    <SelectContent>
                      {GARMENT_SIZES.filter(
                        (s) => !item.sizes.some((is) => is.size === s),
                      ).map((size) => (
                        <SelectItem key={size} value={size}>
                          {SIZE_LABELS[size]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {item.sizes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Add at least one size.</p>
                ) : (
                  <div className="space-y-2">
                    {item.sizes.map((size, sizeIndex) => (
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
                          onChange={(e) =>
                            updateItemSize(itemIndex, sizeIndex, 'quantity', e.target.value)
                          }
                        />
                        <span className="text-sm text-muted-foreground">@</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Price"
                          className="w-24"
                          value={size.unitPrice}
                          onChange={(e) =>
                            updateItemSize(itemIndex, sizeIndex, 'unitPrice', e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeSizeFromItem(itemIndex, sizeIndex)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                        <span className="ml-auto text-sm text-muted-foreground yb-money">
                          {formatMoney(size.quantity * parseFloat(size.unitPrice || '0'))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
                    <span className="text-sm font-medium">Lineup</span>
                    {item.roster.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {item.roster.length} player{item.roster.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>

                {item.rosterExpanded && (
                  <div className="mt-3 space-y-2">
                    {item.roster.map((entry, rosterIndex) => {
                      const availableSizes = item.sizes.filter((s) => s.quantity > 0);
                      return (
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
                              {availableSizes.length > 0
                                ? availableSizes.map((s) => (
                                    <SelectItem key={s.size} value={s.size}>
                                      {SIZE_LABELS[s.size]}
                                    </SelectItem>
                                  ))
                                : GARMENT_SIZES.map((size) => (
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
                      );
                    })}
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
