'use client';

import {
  addOrderItemSchema,
  formatMoney,
  GARMENT_SIZES,
  SIZE_LABELS,
  type GarmentSize,
} from '@yamban/shared';
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

interface AddItemFormProps {
  orderId: string;
}

export function AddItemForm({ orderId }: AddItemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [productId, setProductId] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [description, setDescription] = useState('');
  const [sizes, setSizes] = useState<OrderItemSize[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterExpanded, setRosterExpanded] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch('/api/products?pageSize=100', { credentials: 'include' });
        if (res.ok) {
          const { data } = await res.json();
          setProducts(data.items || []);
        }
      } finally {
        setLoadingData(false);
      }
    }
    fetchProducts();
  }, []);

  async function handleProductChange(id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    setProductId(id);
    setProductName(product.name);

    const res = await fetch(`/api/products/${id}`, { credentials: 'include' });
    if (!res.ok) return;
    const { data: productWithSizes }: { data: ProductWithSizes } = await res.json();

    const newSizes: OrderItemSize[] = productWithSizes.sizes.map((s) => ({
      size: s.size as GarmentSize,
      quantity: 0,
      unitPrice: s.defaultPrice || '0',
    }));

    if (newSizes.length === 0) {
      newSizes.push({ size: 'M', quantity: 1, unitPrice: '0' });
    }

    setSizes(newSizes);
    setRoster([]);
  }

  function updateSize(
    index: number,
    field: 'quantity' | 'unitPrice',
    value: string,
  ) {
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

  function addSize(size: GarmentSize) {
    if (sizes.some((s) => s.size === size)) return;
    setSizes([...sizes, { size, quantity: 1, unitPrice: '0' }]);
  }

  function removeSize(index: number) {
    setSizes(sizes.filter((_, i) => i !== index));
  }

  function addRosterEntry() {
    const defaultSize = sizes[0]?.size ?? 'M';
    setRoster([...roster, { playerName: '', jerseyNumber: '', size: defaultSize }]);
    setRosterExpanded(true);
  }

  function removeRosterEntry(index: number) {
    setRoster(roster.filter((_, i) => i !== index));
  }

  function updateRosterEntry(
    index: number,
    field: keyof RosterEntry,
    value: string,
  ) {
    setRoster(
      roster.map((r, i) => {
        if (i !== index) return r;
        return { ...r, [field]: field === 'size' ? (value as GarmentSize) : value };
      }),
    );
  }

  const subtotal = sizes.reduce(
    (sum, s) => sum + s.quantity * parseFloat(s.unitPrice || '0'),
    0,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filteredSizes = sizes
      .filter((s) => s.quantity > 0)
      .map((s) => ({
        size: s.size,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
      }));

    if (filteredSizes.length === 0) {
      setError('Add at least one size with a quantity.');
      return;
    }

    const filteredRoster = roster
      .filter((r) => r.playerName.trim())
      .map((r) => ({
        playerName: r.playerName.trim(),
        jerseyNumber: r.jerseyNumber.trim() || undefined,
        size: r.size,
      }));

    const data = {
      productId,
      description: description || undefined,
      sizes: filteredSizes,
      roster: filteredRoster,
    };

    const result = addOrderItemSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid item data.');
      return;
    }

    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || 'Failed to add item.');
      return;
    }

    startTransition(() => router.push(`/orders/${orderId}`));
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
      <Surface className="p-6">
        <div className="space-y-2">
          <Label htmlFor="productId">
            Product <span className="text-destructive">*</span>
          </Label>
          <Select value={productId} onValueChange={handleProductChange}>
            <SelectTrigger id="productId">
              <SelectValue placeholder="Select a product" />
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

        {productId && (
          <>
            <div className="mt-4 space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sizes</Label>
                <Select onValueChange={(size) => addSize(size as GarmentSize)}>
                  <SelectTrigger className="h-8 w-[120px]">
                    <Plus className="mr-1 size-3" />
                    <SelectValue placeholder="Add size" />
                  </SelectTrigger>
                  <SelectContent>
                    {GARMENT_SIZES.filter(
                      (s) => !sizes.some((is) => is.size === s),
                    ).map((size) => (
                      <SelectItem key={size} value={size}>
                        {SIZE_LABELS[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sizes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add at least one size.</p>
              ) : (
                <div className="space-y-2">
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
                        className="w-24"
                        value={size.unitPrice}
                        onChange={(e) => updateSize(index, 'unitPrice', e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeSize(index)}
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

            {/* Roster Section */}
            <div className="mt-4 border-t border-border pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setRosterExpanded(!rosterExpanded)}
              >
                <div className="flex items-center gap-2">
                  {rosterExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Add lineup</span>
                  {roster.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {roster.length} player{roster.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>

              {rosterExpanded && (
                <div className="mt-3 space-y-2">
                  {roster.map((entry, index) => {
                    const availableSizes = sizes.filter((s) => s.quantity > 0);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="Name"
                          className="flex-1"
                          value={entry.playerName}
                          onChange={(e) =>
                            updateRosterEntry(index, 'playerName', e.target.value)
                          }
                        />
                        <Input
                          type="text"
                          placeholder="#"
                          className="w-16"
                          value={entry.jerseyNumber}
                          onChange={(e) =>
                            updateRosterEntry(index, 'jerseyNumber', e.target.value)
                          }
                        />
                        <Select
                          value={entry.size}
                          onValueChange={(size) => updateRosterEntry(index, 'size', size)}
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
                          onClick={() => removeRosterEntry(index)}
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
                    onClick={addRosterEntry}
                  >
                    <Plus className="size-3" />
                    Add player
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Surface>

      {productId && (
        <Surface className="mt-4 p-6">
          <dl className="ml-auto w-48 space-y-1 text-sm">
            <div className="flex justify-between font-medium">
              <dt>Item subtotal</dt>
              <dd className="yb-money">{formatMoney(subtotal)}</dd>
            </div>
          </dl>
        </Surface>
      )}

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isPending || !productId}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Adding...
            </>
          ) : (
            'Add item'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
