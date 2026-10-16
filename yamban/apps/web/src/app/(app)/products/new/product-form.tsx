'use client';

import { createProductSchema } from '@yamban/shared';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';

type FieldErrors = Record<string, string[] | undefined>;

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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();

  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [defaultPrice, setDefaultPrice] = useState(initialData?.defaultPrice ?? '0');

  const isEdit = !!initialData;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(undefined);

    const data = {
      name,
      description: description || undefined,
      defaultPrice,
    };

    const result = createProductSchema.safeParse(data);
    if (!result.success) {
      setErrors(z.flattenError(result.error).fieldErrors);
      return;
    }

    const url = isEdit ? `/api/products/${initialData.id}` : '/api/products';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
      credentials: 'include',
    }).catch(() => null);

    if (res?.ok) {
      const { data: product } = await res.json();
      startTransition(() => router.push(`/products/${product.id}`));
    } else {
      const body = (await res?.json().catch(() => null)) as { message?: string; fieldErrors?: FieldErrors } | null;
      if (body?.fieldErrors) setErrors(body.fieldErrors);
      setFormError(body?.message ?? 'Failed to save product.');
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
      {/* Basic Information */}
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Basic information</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <div className="space-y-5">
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
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : 'name-hint'}
              />
              {!errors.name && (
                <p id="name-hint" className="text-xs text-muted-foreground">
                  Product name as shown on orders
                </p>
              )}
              {errors.name && (
                <p id="name-error" className="text-sm text-destructive">{errors.name[0]}</p>
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
                placeholder="Optional internal notes about this product..."
                aria-describedby="description-hint"
              />
              <p id="description-hint" className="text-xs text-muted-foreground">
                Optional internal notes
              </p>
            </div>
          </div>
        </SurfaceBody>
      </Surface>

      {/* Pricing */}
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Pricing</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
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
              aria-invalid={!!errors.defaultPrice}
              aria-describedby={errors.defaultPrice ? 'price-error' : 'price-hint'}
            />
            {!errors.defaultPrice && (
              <p id="price-hint" className="text-xs text-muted-foreground">
                Default price per piece (can be overridden per order)
              </p>
            )}
            {errors.defaultPrice && (
              <p id="price-error" className="text-sm text-destructive">{errors.defaultPrice[0]}</p>
            )}
          </div>
        </SurfaceBody>
      </Surface>

      {/* Form Error */}
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
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
