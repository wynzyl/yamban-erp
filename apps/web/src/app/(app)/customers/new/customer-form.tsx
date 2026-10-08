'use client';

import { createCustomerSchema, updateCustomerSchema } from '@yamban/shared';
import { Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { z } from 'zod';
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
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';

type FieldErrors = Record<string, string[] | undefined>;

interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  mobile: string | null;
  email: string | null;
  facebook: string | null;
  birthday: string | null;
  streetPurok: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  notes: string | null;
}

interface Organization {
  id: string;
  name: string;
  type: string | null;
}

interface CustomerFormProps {
  initialData?: CustomerData;
}

export function CustomerForm({ initialData }: CustomerFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  // Organization state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState(initialData?.organizationId ?? '');
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const isEdit = !!initialData;

  // Fetch organizations
  useEffect(() => {
    fetch('/api/customers/organizations', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setOrganizations(data.data ?? data))
      .catch(() => setOrganizations([]))
      .finally(() => setLoadingOrgs(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = Object.fromEntries(formData) as Record<string, string>;

    // Add organization from state (Select doesn't use FormData)
    if (organizationId) {
      raw.organizationId = organizationId;
    } else {
      delete raw.organizationId;
    }

    // Clean empty optional fields
    if (!raw.birthday) delete raw.birthday;

    const schema = isEdit ? updateCustomerSchema : createCustomerSchema;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setPending(true);
    setErrors({});
    setFormError(undefined);

    const url = isEdit ? `/api/customers/${initialData.id}` : '/api/customers';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(raw),
      credentials: 'include',
    }).catch(() => null);

    if (res?.ok) {
      const data = await res.json().catch(() => null);
      if (isEdit) {
        router.push(`/customers/${initialData.id}`);
      } else if (data?.data?.id) {
        router.push(`/customers/${data.data.id}`);
      } else {
        router.push('/customers');
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
    <form onSubmit={onSubmit} noValidate className="mt-6 space-y-6">
      {/* Basic Information */}
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Basic information</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* First Name */}
            <FormField
              name="firstName"
              label="First name"
              required
              autoComplete="given-name"
              defaultValue={initialData?.firstName}
              placeholder="Juan"
              error={errors.firstName?.[0]}
            />

            {/* Last Name */}
            <FormField
              name="lastName"
              label="Last name"
              autoComplete="family-name"
              defaultValue={initialData?.lastName}
              placeholder="Dela Cruz"
              hint="Optional for single-name customers"
              error={errors.lastName?.[0]}
            />

            {/* Organization */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="organizationId">Organization</Label>
              {loadingOrgs ? (
                <div className="h-10 animate-pulse rounded-control bg-muted" />
              ) : (
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger id="organizationId">
                    <SelectValue placeholder="Select organization (optional)">
                      {organizationId && (
                        <span className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          {organizations.find((o) => o.id === organizationId)?.name}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No organization</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          {org.name}
                          {org.type && (
                            <span className="text-muted-foreground">· {org.type}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Link to a school, barangay, team, or other group
              </p>
              {errors.organizationId?.[0] && (
                <p className="text-sm text-destructive">{errors.organizationId[0]}</p>
              )}
            </div>

            {/* Birthday */}
            <FormField
              name="birthday"
              label="Birthday"
              type="date"
              defaultValue={initialData?.birthday}
              hint="For birthday greetings"
              error={errors.birthday?.[0]}
            />
          </div>
        </SurfaceBody>
      </Surface>

      {/* Contact Information */}
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Contact</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Mobile */}
            <FormField
              name="mobile"
              label="Mobile number"
              type="tel"
              autoComplete="tel"
              defaultValue={initialData?.mobile}
              placeholder="09XX XXX XXXX"
              hint="Philippine mobile number"
              error={errors.mobile?.[0]}
            />

            {/* Email */}
            <FormField
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              defaultValue={initialData?.email}
              placeholder="juan@example.com"
              error={errors.email?.[0]}
            />

            {/* Facebook */}
            <FormField
              name="facebook"
              label="Facebook"
              defaultValue={initialData?.facebook}
              placeholder="facebook.com/username or name"
              hint="Profile URL or display name"
              wide
              error={errors.facebook?.[0]}
            />
          </div>
        </SurfaceBody>
      </Surface>

      {/* Address */}
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Address</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Street/Purok */}
            <FormField
              name="streetPurok"
              label="Street or purok"
              defaultValue={initialData?.streetPurok}
              placeholder="Purok 3, Rizal St."
              wide
              error={errors.streetPurok?.[0]}
            />

            {/* Barangay */}
            <FormField
              name="barangay"
              label="Barangay"
              defaultValue={initialData?.barangay}
              placeholder="Brgy. San Jose"
              error={errors.barangay?.[0]}
            />

            {/* Municipality */}
            <FormField
              name="municipality"
              label="Municipality / City"
              defaultValue={initialData?.municipality}
              placeholder="Davao City"
              error={errors.municipality?.[0]}
            />

            {/* Province */}
            <FormField
              name="province"
              label="Province"
              defaultValue={initialData?.province}
              placeholder="Davao del Sur"
              error={errors.province?.[0]}
            />
          </div>
        </SurfaceBody>
      </Surface>

      {/* Notes */}
      <Surface>
        <SurfaceHeader>
          <SurfaceTitle>Notes</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <div className="space-y-2">
            <Label htmlFor="notes" className="sr-only">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={initialData?.notes ?? ''}
              placeholder="Any special instructions, preferences, or reminders..."
            />
            <p className="text-xs text-muted-foreground">
              Internal notes about this customer
            </p>
            {errors.notes?.[0] && (
              <p className="text-sm text-destructive">{errors.notes[0]}</p>
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
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Update customer' : 'Save customer'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Reusable form field with label, input, hint, and error. */
function FormField({
  name,
  label,
  type = 'text',
  required,
  autoComplete,
  defaultValue,
  placeholder,
  hint,
  wide,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string | null;
  placeholder?: string;
  hint?: string;
  wide?: boolean;
  error?: string;
}) {
  return (
    <div className={wide ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
      />
      {hint && !error && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
