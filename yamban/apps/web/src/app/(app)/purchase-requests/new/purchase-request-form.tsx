'use client';

import { type StockUnit, UNIT_SUFFIX } from '@yamban/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';

interface SupplierOption {
  id: string;
  name: string;
}

interface MaterialOption {
  id: string;
  name: string;
  color: string | null;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  averageUnitCost: string;
  defaultSupplierId: string | null;
}

interface FormLine {
  materialId: string;
  purchaseQuantity: string;
  estimatedUnitCost: string;
}

interface PurchaseRequestFormProps {
  suppliers: SupplierOption[];
  materials: MaterialOption[];
}

export function PurchaseRequestForm({ suppliers, materials }: PurchaseRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState<string>('');
  const [neededBy, setNeededBy] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<FormLine[]>([
    { materialId: '', purchaseQuantity: '', estimatedUnitCost: '' },
  ]);

  // Filter materials by selected supplier
  const filteredMaterials = supplierId
    ? materials.filter((m) => m.defaultSupplierId === supplierId || !m.defaultSupplierId)
    : materials;

  function handleAddLine() {
    setLines([...lines, { materialId: '', purchaseQuantity: '', estimatedUnitCost: '' }]);
  }

  function handleRemoveLine(index: number) {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  function handleLineChange(index: number, field: keyof FormLine, value: string) {
    setLines(
      lines.map((line, i) => {
        if (i !== index) return line;

        const updated = { ...line, [field]: value };

        // Auto-fill unit cost when material is selected
        if (field === 'materialId' && value) {
          const material = materials.find((m) => m.id === value);
          if (material) {
            updated.estimatedUnitCost = material.averageUnitCost;
            // Default to one purchase unit
            if (!updated.purchaseQuantity) {
              updated.purchaseQuantity = material.purchaseQuantity;
            }
          }
        }

        return updated;
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate lines
    const validLines = lines.filter(
      (line) => line.materialId && line.purchaseQuantity && parseFloat(line.purchaseQuantity) > 0,
    );

    if (validLines.length === 0) {
      setError('Add at least one material with a valid quantity.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/purchase-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId: supplierId || null,
            neededBy: neededBy || null,
            notes: notes || null,
            lines: validLines.map((line) => ({
              materialId: line.materialId,
              purchaseQuantity: line.purchaseQuantity,
              estimatedUnitCost: line.estimatedUnitCost || '0',
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          router.push(`/purchase-requests/${data.id}`);
        } else {
          const data = await res.json();
          setError(data.message ?? 'Failed to create purchase request.');
        }
      } catch {
        setError('Failed to create purchase request.');
      }
    });
  }

  function getMaterialLabel(m: MaterialOption) {
    return m.color ? `${m.name} (${m.color})` : m.name;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-4">
        <h3 className="font-medium">Details</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-sm"
            >
              <option value="">No supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Needed by</label>
            <input
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-sm"
            placeholder="Optional notes for this purchase request"
          />
        </div>
      </Surface>

      <Surface className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
          <h3 className="font-medium">Materials</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
            <Plus className="size-4" />
            Add material
          </Button>
        </div>
        <div className="divide-y">
          {lines.map((line, index) => {
            const material = materials.find((m) => m.id === line.materialId);
            const unitSuffix = material ? UNIT_SUFFIX[material.unit] : '';

            return (
              <div key={index} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">Material</label>
                    <select
                      value={line.materialId}
                      onChange={(e) => handleLineChange(index, 'materialId', e.target.value)}
                      className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-sm"
                    >
                      <option value="">Select material</option>
                      {filteredMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {getMaterialLabel(m)}
                        </option>
                      ))}
                    </select>
                    {material && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Purchase unit: {material.purchaseQuantity} {unitSuffix} per {material.purchaseUnit}
                      </p>
                    )}
                  </div>
                  <div className="w-32">
                    <label className="text-sm text-muted-foreground">
                      Quantity{unitSuffix ? ` (${unitSuffix})` : ''}
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={line.purchaseQuantity}
                      onChange={(e) => handleLineChange(index, 'purchaseQuantity', e.target.value)}
                      className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-sm text-muted-foreground">Unit cost</label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={line.estimatedUnitCost}
                      onChange={(e) => handleLineChange(index, 'estimatedUnitCost', e.target.value)}
                      className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
                    />
                  </div>
                  <div className="pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLine(index)}
                      disabled={lines.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      {error && (
        <div className="mt-4 rounded-control border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create purchase request'}
        </Button>
      </div>
    </form>
  );
}
