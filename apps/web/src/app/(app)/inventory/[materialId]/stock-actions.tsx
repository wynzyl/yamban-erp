'use client';

import type { StockUnit } from '@yamban/shared';
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdjustmentForm } from './adjustment-form';
import { WasteForm } from './waste-form';

interface StockActionsProps {
  materialId: string;
  materialName: string;
  unit: StockUnit;
}

export function StockActions({ materialId, materialName, unit }: StockActionsProps) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
          <Plus className="size-4" />
          Adjust
        </Button>
        <Button variant="outline" size="sm" onClick={() => setWasteOpen(true)}>
          <Minus className="size-4" />
          Waste
        </Button>
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock</DialogTitle>
          </DialogHeader>
          <AdjustmentForm
            materialId={materialId}
            materialName={materialName}
            unit={unit}
            onClose={() => setAdjustOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={wasteOpen} onOpenChange={setWasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record waste</DialogTitle>
          </DialogHeader>
          <WasteForm
            materialId={materialId}
            materialName={materialName}
            unit={unit}
            onClose={() => setWasteOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
