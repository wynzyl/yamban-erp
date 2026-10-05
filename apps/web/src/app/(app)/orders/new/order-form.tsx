'use client';

import { createOrderSchema, formatMoney, GARMENT_SIZES, SIZE_LABELS, type GarmentSize } from '@yamban/shared';
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2, Users } from 'lucide-react';
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

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  organizationName: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
}

interface RosterEntry {
  playerName: string;
  jerseyNumber: string;
  size: GarmentSize;
}

interface OrderItem {
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: string;
  roster: RosterEntry[];
  rosterExpanded: boolean;
}

export function OrderForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [customerId, setCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  // Load customers and products
  useEffect(() => {
    async function fetchData() {
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch('/api/customers?pageSize=100', { credentials: 'include' }),
          fetch('/api/products?pageSize=100', { credentials: 'include' }),
        ]);
        if (custRes.ok) {
          const { data: custData } = await custRes.json();
          setCustomers(custData.items || []);
        }
        if (prodRes.ok) {
          const { data: prodData } = await prodRes.json();
          setProducts(prodData.items || []);
        }
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    const customer = customers.find((c) => c.id === id);
    setSelectedCustomer(customer || null);
  }

  function addItem(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        description: '',
        quantity: 1,
        unitPrice: product.defaultPrice || '0',
        roster: [],
        rosterExpanded: false,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
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
    field: keyof RosterEntry,
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

    if (items.length === 0) {
      setErrors({ form: 'Add at least one item.' });
      return;
    }

    // Build items for submission
    // Convert quantity + roster to sizes array for backend compatibility
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
        // No roster - use ONE_SIZE or M as default
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
        productId: item.productId,
        description: item.description || undefined,
        sizes,
        roster: filteredRoster,
      };
    });

    const data = {
      customerId,
      organizationId: selectedCustomer?.organizationId || undefined,
      dueDate: dueDate || undefined,
      discount: discount || '0',
      notes: notes || undefined,
      items: orderItems,
    };

    const result = createOrderSchema.safeParse(data);
    if (!result.success) {
      const firstError = result.error.issues[0];
      if (firstError) {
        setErrors({ form: firstError.message });
      }
      return;
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (res.ok) {
      const { data: order } = await res.json();
      startTransition(() => router.push(`/orders/${order.id}`));
    } else {
      const text = await res.text();
      try {
        const err = JSON.parse(text);
        setErrors({ form: err.message || 'Failed to create order.' });
      } catch {
        setErrors({ form: `Server error (${res.status})` });
      }
    }
  }

  if (loadingData) {
    return (
      <Surface className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </Surface>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Customer Selection */}
      <Surface className="p-6">
        <h2 className="mb-4 font-medium">Customer</h2>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="customerId">
              Customer <span className="text-destructive">*</span>
            </Label>
            <Select value={customerId} onValueChange={handleCustomerChange}>
              <SelectTrigger id="customerId">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => {
                  const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      {name}
                      {c.organizationName && (
                        <span className="ml-1 text-muted-foreground">
                          ({c.organizationName})
                        </span>
                      )}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-sm text-destructive">{errors.customerId}</p>
            )}
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
        </div>
      </Surface>

      {/* Items */}
      <Surface className="mt-4 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Items</h2>
          <Select onValueChange={addItem}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Add product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No items added yet. Select a product above to add items.
          </p>
        ) : (
          <div className="space-y-6">
            {items.map((item, itemIndex) => (
              <div key={itemIndex} className="rounded-lg border border-border p-4">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-medium">{item.productName}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeItem(itemIndex)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
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
        )}

        {errors.items && (
          <p className="mt-2 text-sm text-destructive">{errors.items}</p>
        )}
      </Surface>

      {/* Discount & Notes */}
      <Surface className="mt-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
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
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
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

      {errors.form && (
        <p className="mt-4 text-sm text-destructive">{errors.form}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create order'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
