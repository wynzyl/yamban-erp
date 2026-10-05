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
}

interface ProductWithSizes extends Product {
  sizes: { size: string; defaultPrice: string }[];
}

interface OrderItemSize {
  size: GarmentSize;
  quantity: number;
  unitPrice: string;
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
  sizes: OrderItemSize[];
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
        } else {
          console.error('Failed to fetch customers:', custRes.status);
        }
        if (prodRes.ok) {
          const { data: prodData } = await prodRes.json();
          setProducts(prodData.items || []);
        } else {
          console.error('Failed to fetch products:', prodRes.status);
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

  async function addItem(productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    // Fetch product with sizes
    const res = await fetch(`/api/products/${productId}`, { credentials: 'include' });
    if (!res.ok) return;
    const { data: productWithSizes }: { data: ProductWithSizes } = await res.json();

    // Create sizes array with default prices
    const sizes: OrderItemSize[] = productWithSizes.sizes.map((s) => ({
      size: s.size as GarmentSize,
      quantity: 0,
      unitPrice: s.defaultPrice || '0',
    }));

    // Add default sizes if product has none
    if (sizes.length === 0) {
      sizes.push({ size: 'M', quantity: 1, unitPrice: '0' });
    }

    setItems([
      ...items,
      {
        productId: product.id,
        productName: product.name,
        description: '',
        sizes,
        roster: [],
        rosterExpanded: false,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

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
        // Check if size already exists
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
        // Default to first available size
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

    // Early validation: check if any items have quantities
    const hasAnyQuantity = items.some((item) =>
      item.sizes.some((s) => s.quantity > 0),
    );
    if (!hasAnyQuantity) {
      setErrors({ form: 'Add at least one item with a quantity.' });
      return;
    }

    // Build items for submission (filter out sizes with 0 quantity, then filter out items with no sizes)
    const orderItems = items
      .map((item) => {
        const filteredSizes = item.sizes
          .filter((s) => s.quantity > 0)
          .map((s) => ({
            size: s.size,
            quantity: s.quantity,
            unitPrice: s.unitPrice,
          }));
        // Filter roster to only include entries with names
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
          sizes: filteredSizes,
          roster: filteredRoster,
        };
      })
      .filter((item) => item.sizes.length > 0);

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
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      // Show first error
      const firstError = result.error.issues[0];
      if (firstError) {
        setErrors((prev) => ({ ...prev, form: firstError.message }));
      }
      return;
    }

    console.log('Submitting order data:', JSON.stringify(result.data, null, 2));

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
      console.error('Order creation failed:', res.status, text);
      try {
        const err = JSON.parse(text);
        setErrors({ form: err.message || 'Failed to create order.' });
      } catch {
        setErrors({ form: `Server error (${res.status}): ${text.slice(0, 200)}` });
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
                  <div>
                    <h3 className="font-medium">{item.productName}</h3>
                  </div>
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
                    onChange={(e) =>
                      updateItemDescription(itemIndex, e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Sizes</Label>
                    <Select
                      onValueChange={(size) =>
                        addSizeToItem(itemIndex, size as GarmentSize)
                      }
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
                    <p className="text-sm text-muted-foreground">
                      Add at least one size.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {item.sizes.map((size, sizeIndex) => (
                        <div
                          key={size.size}
                          className="flex items-center gap-3"
                        >
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
                              updateItemSize(
                                itemIndex,
                                sizeIndex,
                                'quantity',
                                e.target.value,
                              )
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            @
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="Price"
                            className="w-24"
                            value={size.unitPrice}
                            onChange={(e) =>
                              updateItemSize(
                                itemIndex,
                                sizeIndex,
                                'unitPrice',
                                e.target.value,
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              removeSizeFromItem(itemIndex, sizeIndex)
                            }
                          >
                            <Trash2 className="size-3" />
                          </Button>
                          <span className="ml-auto text-sm text-muted-foreground yb-money">
                            {formatMoney(
                              size.quantity * parseFloat(size.unitPrice || '0'),
                            )}
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
                      <span className="text-sm font-medium">Add lineup</span>
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
                        // Get available sizes for this item (only sizes with quantity > 0)
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
