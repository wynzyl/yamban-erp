'use client';

import {
  createMachineSchema,
  PRODUCTION_STAGES,
  PRODUCTION_STAGE_LABELS,
  type ProductionStage,
} from '@yamban/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';

type FieldErrors = Record<string, string[] | undefined>;

interface MachineData {
  id: string;
  name: string;
  stage: ProductionStage;
  powerKw: string;
}

interface MachineFormProps {
  initialData?: MachineData;
}

export function MachineForm({ initialData }: MachineFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  const isEdit = !!initialData;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData) as Record<string, string>;

    const parsed = createMachineSchema.safeParse(raw);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(undefined);

    const url = isEdit ? `/api/machines/${initialData.id}` : '/api/machines';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(raw),
    }).catch(() => null);

    if (res?.ok) {
      router.push('/machines');
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
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initialData?.name ?? ''}
          placeholder="e.g. Epson SC-F6330"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name[0]}
          </p>
        )}
      </div>

      {/* Stage */}
      <div className="space-y-2">
        <Label htmlFor="stage">Production stage</Label>
        <NativeSelect
          id="stage"
          name="stage"
          defaultValue={initialData?.stage ?? ''}
          aria-invalid={!!errors.stage}
          aria-describedby={errors.stage ? 'stage-error' : undefined}
        >
          <option value="">Select stage</option>
          {PRODUCTION_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {PRODUCTION_STAGE_LABELS[stage]}
            </option>
          ))}
        </NativeSelect>
        {errors.stage && (
          <p id="stage-error" className="text-sm text-destructive">
            {errors.stage[0]}
          </p>
        )}
      </div>

      {/* Power */}
      <div className="space-y-2">
        <Label htmlFor="powerKw">Power consumption (kW)</Label>
        <Input
          id="powerKw"
          name="powerKw"
          type="text"
          inputMode="decimal"
          defaultValue={initialData?.powerKw ?? ''}
          placeholder="e.g. 1.5"
          aria-invalid={!!errors.powerKw}
          aria-describedby={errors.powerKw ? 'powerKw-error' : undefined}
        />
        {errors.powerKw && (
          <p id="powerKw-error" className="text-sm text-destructive">
            {errors.powerKw[0]}
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
          {pending ? 'Saving…' : isEdit ? 'Update machine' : 'Save machine'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
