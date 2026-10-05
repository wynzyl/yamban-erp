'use client';

import { formatMeasure, formatMoney, type StockUnit, UNIT_SUFFIX } from '@yamban/shared';
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
  purchaseQuantity: string; // qty per purchase unit (e.g., 78 yd per roll)
  expectedQuantity: string; // total stock qty ordered
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

  // Calculate expected units for each line
  const linesWithUnits = lines.map((line) => {
    const purchaseUnitQty = parseFloat(line.purchaseQuantity);
    const expectedUnits = Math.ceil(parseFloat(line.expectedQuantity) / purchaseUnitQty);
    return { ...line, expectedUnits, purchaseUnitQty };
  });

  // Form state - track units received (e.g., 2 rolls) instead of stock qty
  const [lineValues, setLineValues] = useState(
    linesWithUnits.map((line) => ({
      purchaseRequestLineId: line.purchaseRequestLineId,
      receivedUnits: String(line.expectedUnits),
      actualUnitCost: line.estimatedUnitCost,
    })),
  );
  const [reference, setReference] = useState('');

  function handleUnitsChange(index: number, value: string) {
    setLineValues((prev) =>
      prev.map((line, i) => (i === index ? { ...line, receivedUnits: value } : line)),
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

    // Convert units to stock quantities and filter out zero quantities
    const linesToReceive = lineValues
      .map((lineValue, index) => {
        const line = linesWithUnits[index]!;
        const units = parseInt(lineValue.receivedUnits || '0', 10);
        const stockQty = units * line.purchaseUnitQty;
        return {
          purchaseRequestLineId: lineValue.purchaseRequestLineId,
          receivedQuantity: stockQty.toFixed(3),
          actualUnitCost: lineValue.actualUnitCost || '0',
        };
      })
      .filter((line) => parseFloat(line.receivedQuantity) > 0);

    if (linesToReceive.length === 0) {
      setError('Enter at least one line with a quantity to receive.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${prId}/receive`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines: linesToReceive,
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

  // Calculate totals for summary
  const totalLines = lineValues.filter((l) => parseInt(l.receivedUnits || '0', 10) > 0).length;
  const totalValue = lineValues.reduce((sum, lineValue, index) => {
    const line = linesWithUnits[index]!;
    const units = parseInt(lineValue.receivedUnits || '0', 10);
    const stockQty = units * line.purchaseUnitQty;
    const cost = parseFloat(lineValue.actualUnitCost || '0');
    return sum + stockQty * cost;
  }, 0);

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="mt-6 overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <h2 className="font-medium">Materials to receive</h2>
        </div>
        <div className="divide-y">
          {linesWithUnits.map((line, index) => {
            const unitSuffix = UNIT_SUFFIX[line.materialUnit];
            const receivedUnits = parseInt(lineValues[index]?.receivedUnits || '0', 10);
            const receivedStockQty = receivedUnits * line.purchaseUnitQty;
            const lineCost = parseFloat(lineValues[index]?.actualUnitCost || '0');
            const lineTotal = receivedStockQty * lineCost;

            return (
              <div key={line.purchaseRequestLineId} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">
                      {line.materialName}
                      {line.materialColor && (
                        <span className="ml-1 text-muted-foreground">({line.materialColor})</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ordered: {line.expectedUnits} {line.purchaseUnit}
                      <span className="ml-1">({formatMeasure(line.expectedQuantity, unitSuffix)})</span>
                    </p>
                  </div>
                  <div className="flex items-end gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Received ({line.purchaseUnit})</label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={lineValues[index]?.receivedUnits ?? ''}
                        onChange={(e) => handleUnitsChange(index, e.target.value)}
                        className="mt-1 block w-20 rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Unit cost (per {unitSuffix})</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={lineValues[index]?.actualUnitCost ?? ''}
                        onChange={(e) => handleCostChange(index, e.target.value)}
                        className="mt-1 block w-28 rounded-control border border-input bg-card px-3 py-2 text-right text-sm tabular-nums"
                      />
                    </div>
                    <div className="w-24 pb-2 text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="mt-1 font-medium tabular-nums">{formatMoney(lineTotal.toFixed(2))}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Surface>

      <Surface className="mt-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Reference (optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Invoice number, receipt, etc."
              className="mt-1 block w-full rounded-control border border-input bg-card px-3 py-2 text-sm"
            />
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{totalLines} of {lines.length} lines</p>
            <p className="text-lg font-semibold">{formatMoney(totalValue.toFixed(2))}</p>
          </div>
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
          {isPending ? 'Receiving...' : 'Confirm receipt'}
        </Button>
      </div>
    </form>
  );
}
