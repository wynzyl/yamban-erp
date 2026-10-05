'use client';

import {
  addProductProcessSchema,
  GARMENT_SIZES,
  type GarmentSize,
  type ProductionStage,
  PRODUCTION_STAGE_LABELS,
  SIZE_LABELS,
} from '@yamban/shared';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';

interface Machine {
  id: string;
  name: string;
  stage: ProductionStage;
  powerKw: string;
}

interface AddProcessFormProps {
  productId: string;
  machines: Machine[];
  availableSizes: GarmentSize[];
}

export function AddProcessForm({ productId, machines, availableSizes }: AddProcessFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group machines by stage
  const machinesByStage = new Map<ProductionStage, Machine[]>();
  for (const m of machines) {
    const arr = machinesByStage.get(m.stage) ?? [];
    arr.push(m);
    machinesByStage.set(m.stage, arr);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData) as Record<string, string>;

    const parsed = addProductProcessSchema.safeParse(raw);
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).formErrors[0] ?? 'Invalid input.');
      return;
    }

    setPending(true);
    setError(null);

    const res = await fetch(`/api/products/${productId}/processes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(raw),
    });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.message ?? 'Failed to add process.');
    }
    setPending(false);
  }

  if (availableSizes.length === 0 || machines.length === 0) {
    return null;
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add process
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add machine process</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <NativeSelect id="size" name="size" required>
                <option value="">Select size</option>
                {availableSizes.map((size) => (
                  <option key={size} value={size}>
                    {SIZE_LABELS[size]}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machineId">Machine</Label>
              <NativeSelect id="machineId" name="machineId" required>
                <option value="">Select machine</option>
                {Array.from(machinesByStage.entries()).map(([stage, stagesMachines]) => (
                  <optgroup key={stage} label={PRODUCTION_STAGE_LABELS[stage]}>
                    {stagesMachines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.powerKw} kW)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutesPerPiece">Minutes per piece</Label>
              <Input
                id="minutesPerPiece"
                name="minutesPerPiece"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2.5"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Adding...' : 'Add process'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
