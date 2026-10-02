'use client';

import { createSupplierSchema, updateSupplierSchema } from '@yamban/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FieldErrors = Record<string, string[] | undefined>;

interface SupplierData {
  id: string;
  name: string;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

const fields: { name: keyof SupplierData; label: string; type?: string; placeholder?: string; wide?: boolean }[] = [
  { name: 'name', label: 'Supplier name' },
  { name: 'contactPerson', label: 'Contact person' },
  { name: 'mobile', label: 'Mobile', type: 'tel', placeholder: '0917 123 4567' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address', wide: true },
];

interface SupplierFormProps {
  initialData?: SupplierData;
}

export function SupplierForm({ initialData }: SupplierFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  const isEdit = !!initialData;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;

    // Same schema the API uses
    const schema = isEdit ? updateSupplierSchema : createSupplierSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(undefined);

    const url = isEdit ? `/api/suppliers/${initialData.id}` : '/api/suppliers';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(raw),
    }).catch(() => null);

    if (res?.ok) {
      if (isEdit) {
        router.push(`/suppliers/${initialData.id}`);
      } else {
        router.push('/suppliers');
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
      {fields.map((f) => {
        const err = errors[f.name]?.[0];
        const defaultValue = initialData?.[f.name] ?? '';
        return (
          <div key={f.name} className={f.wide ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input
              id={f.name}
              name={f.name}
              type={f.type ?? 'text'}
              placeholder={f.placeholder}
              defaultValue={defaultValue}
              aria-invalid={!!err}
              aria-describedby={err ? `${f.name}-error` : undefined}
            />
            {err && (
              <p id={`${f.name}-error`} className="text-sm text-destructive">
                {err}
              </p>
            )}
          </div>
        );
      })}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialData?.notes ?? ''}
          className="w-full rounded-control border border-input bg-card px-3 py-2 text-base md:text-sm"
        />
      </div>
      {formError && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {formError}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Update supplier' : 'Save supplier'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
