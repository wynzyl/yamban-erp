'use client';

import {
  createMaterialSchema,
  updateMaterialSchema,
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
  STOCK_UNITS,
  UNIT_SUFFIX,
  type StockUnit,
} from '@yamban/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';

type FieldErrors = Record<string, string[] | undefined>;

interface Supplier {
  id: string;
  name: string;
}

interface MaterialData {
  id: string;
  name: string;
  color: string | null;
  category: string;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  defaultSupplierId: string | null;
  reorderLevel: string;
}

interface MaterialFormProps {
  initialData?: MaterialData;
  suppliers: Supplier[];
}

export function MaterialForm({ initialData, suppliers }: MaterialFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  const isEdit = !!initialData;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData) as Record<string, string>;

    // Handle empty optional fields
    if (!raw.defaultSupplierId) delete raw.defaultSupplierId;
    if (!raw.reorderLevel) raw.reorderLevel = '0';

    // Same schema the API uses
    const schema = isEdit ? updateMaterialSchema : createMaterialSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(undefined);

    const url = isEdit ? `/api/materials/${initialData.id}` : '/api/materials';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(raw),
    }).catch(() => null);

    if (res?.ok) {
      if (isEdit) {
        router.push(`/materials/${initialData.id}`);
      } else {
        router.push('/materials');
      }
      router.refresh();
      return;
    }
    setPending(false);
    const body = (await res?.json().catch(() => null)) as { message?: string; fieldErrors?: FieldErrors } | null;
    if (body?.fieldErrors) setErrors(body.fieldErrors);
    setFormError(body?.message ?? 'Cannot reach the server. Check the connection and try again.');
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialData?.name ?? ''}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name[0]}
          </p>
        )}
      </div>

      {/* Color */}
      <div className="space-y-2">
        <Label htmlFor="color">Color (optional)</Label>
        <Input
          id="color"
          name="color"
          defaultValue={initialData?.color ?? ''}
          placeholder="e.g. Red, Navy Blue"
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <NativeSelect
          id="category"
          name="category"
          defaultValue={initialData?.category ?? ''}
          aria-invalid={!!errors.category}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="">Select category</option>
          {MATERIAL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {MATERIAL_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </NativeSelect>
        {errors.category && (
          <p id="category-error" className="text-sm text-destructive">
            {errors.category[0]}
          </p>
        )}
      </div>

      {/* Unit */}
      <div className="space-y-2">
        <Label htmlFor="unit">Stock unit</Label>
        <NativeSelect
          id="unit"
          name="unit"
          defaultValue={initialData?.unit ?? ''}
          aria-invalid={!!errors.unit}
          aria-describedby={errors.unit ? 'unit-error' : undefined}
        >
          <option value="">Select unit</option>
          {STOCK_UNITS.map((unit) => (
            <option key={unit} value={unit}>
              {UNIT_SUFFIX[unit]} ({unit.toLowerCase()})
            </option>
          ))}
        </NativeSelect>
        {errors.unit && (
          <p id="unit-error" className="text-sm text-destructive">
            {errors.unit[0]}
          </p>
        )}
      </div>

      {/* Purchase Unit */}
      <div className="space-y-2">
        <Label htmlFor="purchaseUnit">Purchase unit</Label>
        <Input
          id="purchaseUnit"
          name="purchaseUnit"
          defaultValue={initialData?.purchaseUnit ?? ''}
          placeholder="e.g. roll, bottle, pack"
          aria-invalid={!!errors.purchaseUnit}
          aria-describedby={errors.purchaseUnit ? 'purchaseUnit-error' : undefined}
        />
        {errors.purchaseUnit && (
          <p id="purchaseUnit-error" className="text-sm text-destructive">
            {errors.purchaseUnit[0]}
          </p>
        )}
      </div>

      {/* Purchase Quantity */}
      <div className="space-y-2">
        <Label htmlFor="purchaseQuantity">Quantity per purchase</Label>
        <Input
          id="purchaseQuantity"
          name="purchaseQuantity"
          type="text"
          inputMode="decimal"
          defaultValue={initialData?.purchaseQuantity ?? ''}
          placeholder="e.g. 78 (yards per roll)"
          aria-invalid={!!errors.purchaseQuantity}
          aria-describedby={errors.purchaseQuantity ? 'purchaseQuantity-error' : undefined}
        />
        {errors.purchaseQuantity && (
          <p id="purchaseQuantity-error" className="text-sm text-destructive">
            {errors.purchaseQuantity[0]}
          </p>
        )}
      </div>

      {/* Default Supplier */}
      <div className="space-y-2">
        <Label htmlFor="defaultSupplierId">Default supplier (optional)</Label>
        <NativeSelect id="defaultSupplierId" name="defaultSupplierId" defaultValue={initialData?.defaultSupplierId ?? ''}>
          <option value="">None</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Reorder Level */}
      <div className="space-y-2">
        <Label htmlFor="reorderLevel">Reorder level (optional)</Label>
        <Input
          id="reorderLevel"
          name="reorderLevel"
          type="text"
          inputMode="decimal"
          defaultValue={initialData?.reorderLevel ?? ''}
          placeholder="0"
        />
        {errors.reorderLevel && (
          <p id="reorderLevel-error" className="text-sm text-destructive">
            {errors.reorderLevel[0]}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {formError}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Update material' : 'Save material'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
