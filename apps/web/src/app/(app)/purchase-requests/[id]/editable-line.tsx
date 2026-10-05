'use client';

import { formatMeasure, formatMoney, type StockUnit, UNIT_SUFFIX } from '@yamban/shared';
import { Check, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { RemoveLineButton } from './remove-line-button';

interface LineData {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  shortageQuantity: string;
  purchaseQty: string;
  estimatedUnitCost: string;
  estimatedTotal: string;
  linkedOrders: { orderId: string; orderNumber: string; quantity: string }[];
}

interface EditableLineProps {
  prId: string;
  line: LineData;
  canEdit: boolean;
}

export function EditableLine({ prId, line, canEdit }: EditableLineProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  // Convert stock quantity to purchase units for editing
  const purchaseUnitQty = parseFloat(line.purchaseQuantity); // e.g., 1000 ml per bottle
  const currentUnits = Math.ceil(parseFloat(line.purchaseQty) / purchaseUnitQty);

  const [units, setUnits] = useState(String(currentUnits));
  const [cost, setCost] = useState(line.estimatedUnitCost);
  const [error, setError] = useState<string | null>(null);

  const unitSuffix = UNIT_SUFFIX[line.materialUnit];

  function handleCancel() {
    setUnits(String(currentUnits));
    setCost(line.estimatedUnitCost);
    setIsEditing(false);
    setError(null);
  }

  function handleSave() {
    const numUnits = parseInt(units, 10);
    if (!units || numUnits <= 0) {
      setError('Enter a valid quantity.');
      return;
    }

    // Convert purchase units back to stock quantity
    const stockQty = numUnits * purchaseUnitQty;

    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/purchase-requests/${prId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines: [
              {
                id: line.id,
                purchaseQuantity: stockQty.toFixed(3),
                estimatedUnitCost: cost || '0',
              },
            ],
          }),
        });

        if (res.ok) {
          setIsEditing(false);
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.message ?? 'Failed to update.');
        }
      } catch {
        setError('Failed to update.');
      }
    });
  }

  // Calculate total based on stock quantity
  const editStockQty = parseInt(units || '0', 10) * purchaseUnitQty;
  const total = editStockQty * parseFloat(cost || '0');

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <div>
            <span className="font-medium">
              {line.materialName}
              {line.materialColor && (
                <span className="ml-1 text-muted-foreground">({line.materialColor})</span>
              )}
            </span>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          {formatMeasure(line.shortageQuantity, unitSuffix)}
        </TableCell>
        <TableCell className="text-right">
          <input
            type="number"
            step="1"
            min="1"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className="w-20 rounded-control border border-input bg-card px-2 py-1 text-right text-sm tabular-nums"
            autoFocus
          />
          <span className="ml-1 text-xs text-muted-foreground">{line.purchaseUnit}</span>
        </TableCell>
        <TableCell className="text-right">
          <input
            type="number"
            step="0.0001"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-24 rounded-control border border-input bg-card px-2 py-1 text-right text-sm tabular-nums"
          />
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {formatMoney(total.toFixed(2))}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="text-success hover:text-success"
            >
              <Check className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isPending}
              className="text-muted-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div>
          <span className="font-medium">
            {line.materialName}
            {line.materialColor && (
              <span className="ml-1 text-muted-foreground">({line.materialColor})</span>
            )}
          </span>
          {line.linkedOrders.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {line.linkedOrders.map((order) => (
                <Link
                  key={order.orderId}
                  href={`/orders/${order.orderId}`}
                  className="text-xs text-muted-foreground hover:text-primary hover:underline"
                >
                  {order.orderNumber}
                </Link>
              ))}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatMeasure(line.shortageQuantity, unitSuffix)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatMeasure(line.purchaseQty, unitSuffix)}
        <span className="ml-1 text-xs text-muted-foreground">
          ({Math.ceil(parseFloat(line.purchaseQty) / parseFloat(line.purchaseQuantity))} {line.purchaseUnit})
        </span>
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        {formatMoney(parseFloat(line.estimatedUnitCost).toFixed(2))}/{unitSuffix}
      </TableCell>
      <TableCell className="text-right tabular-nums">{formatMoney(line.estimatedTotal)}</TableCell>
      {canEdit && (
        <TableCell>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-4" />
            </Button>
            <RemoveLineButton prId={prId} lineId={line.id} />
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
