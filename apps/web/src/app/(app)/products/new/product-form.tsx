'use client';

import { createProductSchema } from '@yamban/shared';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
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
  const [defaultPrice, setDefaultPrice] = useState(initialData?.defaultPrice ?? '0');

  const isEdit = !!initialData;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const data = {
      name,
      description: description || undefined,
      defaultPrice,
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
      const { data: product } = await res.json();
      startTransition(() => router.push(`/products/${product.id}`));
    } else {
      const err = await res.json().catch(() => ({}));
      setErrors({ form: err.message || 'Failed to save product.' });
    }
  }

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

          {/* Default Price */}
          <div className="space-y-2">
            <Label htmlFor="defaultPrice">
              Default price <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              id="defaultPrice"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              placeholder="0.00"
              className="w-40"
            />
            {errors.defaultPrice && (
              <p className="text-sm text-destructive">{errors.defaultPrice}</p>
            )}
          </div>
        </div>
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
