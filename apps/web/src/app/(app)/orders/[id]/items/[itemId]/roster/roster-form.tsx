'use client';

import {
  GARMENT_SIZES,
  SIZE_LABELS,
  updateRosterSchema,
  type GarmentSize,
} from '@yamban/shared';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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

interface RosterEditFormProps {
  orderId: string;
  item: OrderItem;
}

interface EditableRosterEntry {
  playerName: string;
  jerseyNumber: string;
  size: GarmentSize;
}

export function RosterEditForm({ orderId, item }: RosterEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [roster, setRoster] = useState<EditableRosterEntry[]>(
    item.roster.map((r) => ({
      playerName: r.playerName,
      jerseyNumber: r.jerseyNumber ?? '',
      size: r.size,
    })),
  );

  const availableSizes = item.sizes.filter((s) => s.quantity > 0);

  function addEntry() {
    const defaultSize = availableSizes[0]?.size ?? 'M';
    setRoster([...roster, { playerName: '', jerseyNumber: '', size: defaultSize }]);
  }

  function removeEntry(index: number) {
    setRoster(roster.filter((_, i) => i !== index));
  }

  function updateEntry(
    index: number,
    field: 'playerName' | 'jerseyNumber' | 'size',
    value: string,
  ) {
    setRoster(
      roster.map((entry, i) => {
        if (i !== index) return entry;
        return {
          ...entry,
          [field]: field === 'size' ? (value as GarmentSize) : value,
        };
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filteredRoster = roster
      .filter((r) => r.playerName.trim())
      .map((r) => ({
        playerName: r.playerName.trim(),
        jerseyNumber: r.jerseyNumber.trim() || undefined,
        size: r.size,
      }));

    const data = { roster: filteredRoster };

    const result = updateRosterSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid roster data.');
      return;
    }

    const res = await fetch(`/api/orders/${orderId}/items/${item.id}/roster`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.message || 'Failed to update roster.');
      return;
    }

    startTransition(() => router.push(`/orders/${orderId}`));
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <Label className="text-base font-medium">Lineup</Label>
          <Button type="button" variant="outline" size="sm" onClick={addEntry}>
            <Plus className="size-3" />
            Add player
          </Button>
        </div>

        {roster.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No players added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {roster.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Name"
                  className="flex-1"
                  value={entry.playerName}
                  onChange={(e) => updateEntry(index, 'playerName', e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="#"
                  className="w-16"
                  value={entry.jerseyNumber}
                  onChange={(e) => updateEntry(index, 'jerseyNumber', e.target.value)}
                />
                <Select
                  value={entry.size}
                  onValueChange={(size) => updateEntry(index, 'size', size)}
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
                  onClick={() => removeEntry(index)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableSizes.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Available sizes:{' '}
              {availableSizes.map((s) => `${SIZE_LABELS[s.size]} (${s.quantity})`).join(', ')}
            </p>
          </div>
        )}
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
            'Save roster'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
