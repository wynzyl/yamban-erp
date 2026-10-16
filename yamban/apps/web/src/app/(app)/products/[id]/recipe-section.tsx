'use client';

import {
  addRecipeMaterialSchema,
  type ProductionStage,
  PRODUCTION_STAGES,
  PRODUCTION_STAGE_LABELS,
  UNIT_SUFFIX,
  type StockUnit,
} from '@yamban/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RecipeMaterial {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: StockUnit;
  quantityPerPiece: string;
  stage: ProductionStage;
}

interface Material {
  id: string;
  name: string;
  color: string | null;
  unit: StockUnit;
}

interface RecipeSectionProps {
  productId: string;
  recipe: RecipeMaterial[];
  materials: Material[];
}

export function RecipeSection({ productId, recipe, materials }: RecipeSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get materials not already in recipe
  const usedMaterialIds = new Set(recipe.map((r) => r.materialId));
  const availableMaterials = materials.filter((m) => !usedMaterialIds.has(m.id));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData) as Record<string, string>;

    const parsed = addRecipeMaterialSchema.safeParse(raw);
    if (!parsed.success) {
      const flattened = z.flattenError(parsed.error);
      const firstFieldError = Object.values(flattened.fieldErrors)[0]?.[0];
      setError(flattened.formErrors[0] ?? firstFieldError ?? 'Invalid input.');
      return;
    }

    setPending(true);
    setError(null);

    const res = await fetch(`/api/products/${productId}/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(raw),
    });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.message ?? 'Failed to add material.');
    }
    setPending(false);
  }

  async function handleDelete(recipeMaterialId: string) {
    setDeletingId(recipeMaterialId);

    const res = await fetch(`/api/products/${productId}/recipe/${recipeMaterialId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      router.refresh();
    }
    setDeletingId(null);
  }

  return (
    <Surface className="mt-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="font-medium">Recipe</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Materials needed to produce one piece. Used to compute material costs.
          </p>
        </div>
        {availableMaterials.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add material
          </Button>
        )}
      </div>

      {recipe.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No recipe configured. Add materials to track production costs.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Qty per piece</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipe.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.materialName}
                  {item.materialColor && (
                    <span className="ml-1 text-muted-foreground">({item.materialColor})</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{PRODUCTION_STAGE_LABELS[item.stage]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {parseFloat(item.quantityPerPiece).toFixed(3)} {UNIT_SUFFIX[item.materialUnit]}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add recipe material</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="materialId">Material</Label>
              <NativeSelect id="materialId" name="materialId" required>
                <option value="">Select material</option>
                {availableMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.color ? ` (${m.color})` : ''}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantityPerPiece">Quantity per piece</Label>
              <Input
                id="quantityPerPiece"
                name="quantityPerPiece"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 1.500"
                required
              />
              <p className="text-xs text-muted-foreground">
                Amount of material used for one piece (in the material's unit).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Production stage</Label>
              <NativeSelect id="stage" name="stage" required>
                <option value="">Select stage</option>
                {PRODUCTION_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {PRODUCTION_STAGE_LABELS[stage]}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                Stage when this material is used (for inventory deduction).
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Adding...' : 'Add material'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Surface>
  );
}
