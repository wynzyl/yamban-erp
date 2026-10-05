'use client';

import { type StockUnit, UNIT_SUFFIX } from '@yamban/shared';
import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';

interface MaterialOption {
  id: string;
  name: string;
  color: string | null;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  averageUnitCost: string;
}

interface AddLineFormProps {
  prId: string;
  materials: MaterialOption[];
}

export function AddLineForm({ prId, materials }: AddLineFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [materialId, setMaterialId] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('');
  const [estimatedUnitCost, setEstimatedUnitCost] = useState('');

  const selectedMaterial = materials.find((m) => m.id === materialId);
  const unitSuffix = selectedMaterial ? UNIT_SUFFIX[selectedMaterial.unit] : '';

  function handleMaterialChange(id: string) {
    setMaterialId(id);
    const material = materials.find((m) => m.id === id);
    if (material) {
      setEstimatedUnitCost(material.averageUnitCost);
      setPurchaseQuantity(material.purchaseQuantity);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setMaterialId('');
    setPurchaseQuantity('');
    setEstimatedUnitCost('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!materialId || !purchaseQuantity || parseFloat(purchaseQuantity) <= 0) {
      setError('Select a material and enter a valid quantity.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${prId}/lines`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            materialId,
            purchaseQuantity,
            estimatedUnitCost: estimatedUnitCost || '0',
          }),
        });

        if (res.ok) {
          handleClose();
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.message ?? 'Failed to add line.');
        }
      } catch {
        setError('Failed to add line.');
      }
    });
  }

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="size-4" />
        Add material
      </Button>
    );
  }

  return (
    <Surface className="mt-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Add material</h3>
        <button
          type="button"
          onClick={handleClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="text-sm text-muted-foreground">Material</label>
            <select
              value={materialId}
              onChange={(e) => handleMaterialChange(e.target.value)}
              className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-sm"
            >
              <option value="">Select material</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.color ? `${m.name} (${m.color})` : m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">
              Quantity{unitSuffix ? ` (${unitSuffix})` : ''}
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={purchaseQuantity}
              onChange={(e) => setPurchaseQuantity(e.target.value)}
              className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Unit cost</label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={estimatedUnitCost}
              onChange={(e) => setEstimatedUnitCost(e.target.value)}
              className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
            />
          </div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </form>
    </Surface>
  );
}
