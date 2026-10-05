'use client';

import { formatMeasure, type StockUnit, UNIT_SUFFIX } from '@yamban/shared';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';

interface FormLine {
  purchaseRequestLineId: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  expectedQuantity: string;
  estimatedUnitCost: string;
}

interface ReceiveFormProps {
  prId: string;
  prNumber: string;
  lines: FormLine[];
}

export function ReceiveForm({ prId, prNumber, lines }: ReceiveFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state for each line
  const [lineValues, setLineValues] = useState(
    lines.map((line) => ({
      purchaseRequestLineId: line.purchaseRequestLineId,
      receivedQuantity: line.expectedQuantity,
      actualUnitCost: line.estimatedUnitCost,
    })),
  );
  const [reference, setReference] = useState('');

  function handleQuantityChange(index: number, value: string) {
    setLineValues((prev) =>
      prev.map((line, i) => (i === index ? { ...line, receivedQuantity: value } : line)),
    );
  }

  function handleCostChange(index: number, value: string) {
    setLineValues((prev) =>
      prev.map((line, i) => (i === index ? { ...line, actualUnitCost: value } : line)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate all lines have values
    const invalidLines = lineValues.filter(
      (line) => !line.receivedQuantity || parseFloat(line.receivedQuantity) <= 0,
    );
    if (invalidLines.length > 0) {
      setError('All lines must have a received quantity greater than 0.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${prId}/receive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines: lineValues,
            reference: reference || null,
          }),
        });

        if (res.ok) {
          router.push(`/purchase-requests/${prId}`);
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.message ?? 'Failed to receive delivery.');
        }
      } catch {
        setError('Failed to receive delivery.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="mt-6 overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <h2 className="font-medium">Materials to receive</h2>
        </div>
        <div className="divide-y">
          {lines.map((line, index) => {
            const unitSuffix = UNIT_SUFFIX[line.materialUnit];
            return (
              <div key={line.purchaseRequestLineId} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {line.materialName}
                      {line.materialColor && (
                        <span className="ml-1 text-muted-foreground">({line.materialColor})</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Expected: {formatMeasure(line.expectedQuantity, unitSuffix)}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Received qty ({unitSuffix})</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={lineValues[index]?.receivedQuantity ?? ''}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        className="mt-1 block w-32 rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Unit cost</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={lineValues[index]?.actualUnitCost ?? ''}
                        onChange={(e) => handleCostChange(index, e.target.value)}
                        className="mt-1 block w-32 rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      <Surface className="mt-4 p-4">
        <label className="text-sm font-medium">Reference (optional)</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Invoice number, receipt, etc."
          className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-sm"
        />
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
          {isPending ? 'Receiving...' : 'Confirm receipt'}
        </Button>
      </div>
    </form>
  );
}
