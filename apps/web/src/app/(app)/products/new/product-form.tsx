'use client';

import {
  createProductSchema,
  formatMoney,
  GARMENT_SIZES,
  SIZE_LABELS,
  type GarmentSize,
} from '@yamban/shared';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';

interface ProductSize {
  size: GarmentSize;
  defaultPrice: string;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  sizes: { size: GarmentSize; defaultPrice: string }[];
}

interface ProductFormProps {
  initialData?: ProductData;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [sizes, setSizes] = useState<ProductSize[]>(
    initialData?.sizes ?? [],
  );

  const isEdit = !!initialData;

  function addSize(size: GarmentSize) {
    if (sizes.some((s) => s.size === size)) return;
    setSizes([...sizes, { size, defaultPrice: '0' }]);
  }

  function removeSize(index: number) {
    setSizes(sizes.filter((_, i) => i !== index));
  }

  function updateSizePrice(index: number, price: string) {
    setSizes(
      sizes.map((s, i) => (i === index ? { ...s, defaultPrice: price } : s)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const data = {
      name,
      description: description || undefined,
      sizes: sizes.map((s) => ({
        size: s.size,
        defaultPrice: s.defaultPrice,
      })),
    };

    const result = createProductSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    const url = isEdit ? `/api/products/${initialData.id}` : '/api/products';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    });

    if (res.ok) {
      const product = await res.json();
      startTransition(() => router.push(`/products/${product.id}`));
    } else {
      const err = await res.json().catch(() => ({}));
      setErrors({ form: err.message || 'Failed to save product.' });
    }
  }

  const availableSizes = GARMENT_SIZES.filter(
    (s) => !sizes.some((ps) => ps.size === s),
  );

  return (
    <form onSubmit={handleSubmit}>
      <Surface className="p-6">
        <div className="grid gap-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Basketball Jersey"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional description..."
            />
          </div>
        </div>
      </Surface>

      {/* Sizes & Pricing */}
      <Surface className="mt-4 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">Sizes & default pricing</h2>
          {availableSizes.length > 0 && (
            <Select onValueChange={(size) => addSize(size as GarmentSize)}>
              <SelectTrigger className="w-[140px]">
                <Plus className="mr-1 size-3" />
                <SelectValue placeholder="Add size" />
              </SelectTrigger>
              <SelectContent>
                {availableSizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {SIZE_LABELS[size]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {sizes.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No sizes added yet. Use the dropdown above to add sizes.
          </p>
        ) : (
          <div className="space-y-3">
            {sizes.map((size, index) => (
              <div key={size.size} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium">
                  {SIZE_LABELS[size.size]}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="w-32"
                  value={size.defaultPrice}
                  onChange={(e) => updateSizePrice(index, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeSize(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Surface>

      {errors.form && (
        <p className="mt-4 text-sm text-destructive">{errors.form}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            'Save changes'
          ) : (
            'Create product'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
