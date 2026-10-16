'use client';

import type { StockUnit } from '@yamban/shared';
import { UNIT_SUFFIX } from '@yamban/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdjustmentFormProps {
  materialId: string;
  materialName: string;
  unit: StockUnit;
  onClose: () => void;
}

export function AdjustmentForm({ materialId, materialName, unit, onClose }: AdjustmentFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unitSuffix = UNIT_SUFFIX[unit];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const quantity = formData.get('quantity') as string;
    const reference = formData.get('reference') as string;

    if (!quantity || parseFloat(quantity) === 0) {
      setError('Enter a non-zero quantity.');
      return;
    }

    setPending(true);
    setError(null);

    const res = await fetch('/api/inventory/adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        materialId,
        quantity,
        reference: reference || undefined,
      }),
    });

    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      const data = await res.json();
      setError(data.message ?? 'Failed to record adjustment.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Adjust stock for <span className="font-medium text-foreground">{materialName}</span>.
        Use positive numbers to add stock, negative to reduce.
      </p>

      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity ({unitSuffix})</Label>
        <Input
          id="quantity"
          name="quantity"
          type="text"
          inputMode="decimal"
          placeholder="e.g. 10 or -5"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reason (optional)</Label>
        <Input
          id="reference"
          name="reference"
          placeholder="e.g. Physical count correction"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save adjustment'}
        </Button>
      </div>
    </form>
  );
}
