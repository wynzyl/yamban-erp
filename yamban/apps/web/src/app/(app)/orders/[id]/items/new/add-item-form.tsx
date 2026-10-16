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
  defaultPrice: string;
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
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('0');
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

  function handleProductChange(id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    setProductId(id);
    setProductName(product.name);
    setUnitPrice(product.defaultPrice || '0');
    setRoster([]);
  }

  function addRosterEntry() {
    setRoster([...roster, { playerName: '', jerseyNumber: '', size: 'M' as GarmentSize }]);
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

  const subtotal = quantity * parseFloat(unitPrice || '0');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!productId) {
      setError('Select a product.');
      return;
    }

    // Count sizes from roster entries
    const sizeCounts = new Map<GarmentSize, number>();
    for (const r of roster) {
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
        unitPrice,
      }));
    } else {
      sizes = [{ size: 'ONE_SIZE' as GarmentSize, quantity, unitPrice }];
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
      sizes,
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

            <div className="mt-4 flex items-center gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  className="w-24"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit price</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  className="w-32"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </div>
              <div className="ml-auto space-y-2">
                <Label className="text-muted-foreground">Subtotal</Label>
                <p className="py-2 text-sm font-medium yb-money">
                  {formatMoney(subtotal)}
                </p>
              </div>
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
                  <span className="text-sm font-medium">Roster</span>
                  {roster.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {roster.length} player{roster.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>

              {rosterExpanded && (
                <div className="mt-3 space-y-2">
                  {roster.map((entry, index) => (
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
                        onClick={() => removeRosterEntry(index)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
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
