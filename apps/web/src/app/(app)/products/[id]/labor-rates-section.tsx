'use client';

import {
  type ProductionStage,
  PRODUCTION_STAGES,
  PRODUCTION_STAGE_LABELS,
} from '@yamban/shared';
import { Check, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Money } from '@/components/domain/money';

interface ProductStage {
  id: string;
  stage: ProductionStage;
  sequence: number;
  laborRatePerPiece: string | null;
}

interface DefaultLaborRate {
  id: string;
  stage: ProductionStage;
  ratePerPiece: string;
}

interface LaborRatesSectionProps {
  productId: string;
  stages: ProductStage[];
  defaultRates: DefaultLaborRate[];
}

export function LaborRatesSection({ productId, stages, defaultRates }: LaborRatesSectionProps) {
  const router = useRouter();

  // Build a map of stage -> rate (product specific or default)
  const stageMap = new Map(stages.map((s) => [s.stage, s]));
  const defaultMap = new Map(defaultRates.map((r) => [r.stage, r.ratePerPiece]));

  return (
    <Surface className="mt-6 overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-medium">Labor rates</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Per piece labor cost for each production stage. Leave blank to use the default rate.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Default rate</TableHead>
            <TableHead className="text-right">Product rate</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {PRODUCTION_STAGES.map((stage) => {
            const productStage = stageMap.get(stage);
            const defaultRate = defaultMap.get(stage) ?? '0.00';
            const productRate = productStage?.laborRatePerPiece;

            return (
              <LaborRateRow
                key={stage}
                productId={productId}
                stage={stage}
                defaultRate={defaultRate}
                productRate={productRate}
                onSaved={() => router.refresh()}
              />
            );
          })}
        </TableBody>
      </Table>
    </Surface>
  );
}

interface LaborRateRowProps {
  productId: string;
  stage: ProductionStage;
  defaultRate: string;
  productRate: string | null | undefined;
  onSaved: () => void;
}

function LaborRateRow({ productId, stage, defaultRate, productRate, onSaved }: LaborRateRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(productRate ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setPending(true);
    setError(null);

    const res = await fetch(`/api/products/${productId}/labor-rates/${stage}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laborRatePerPiece: value.trim() || null }),
    });

    if (res.ok) {
      setEditing(false);
      onSaved();
    } else {
      const data = await res.json();
      setError(data.message ?? 'Failed to save.');
    }
    setPending(false);
  }

  function handleCancel() {
    setValue(productRate ?? '');
    setEditing(false);
    setError(null);
  }

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline">{PRODUCTION_STAGE_LABELS[stage]}</Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums text-muted-foreground">
        <Money value={defaultRate} />
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-2">
            <Input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Use default"
              className="h-8 w-24 text-right"
              autoFocus
              disabled={pending}
            />
          </div>
        ) : (
          <span className="tabular-nums">
            {productRate ? <Money value={productRate} /> : <span className="text-muted-foreground">Default</span>}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {editing ? (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={handleCancel}
              disabled={pending}
            >
              <X className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-success hover:text-success"
              onClick={handleSave}
              disabled={pending}
            >
              <Check className="size-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </TableCell>
    </TableRow>
  );
}
