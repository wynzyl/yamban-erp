import { formatDate, formatMobile } from '@yamban/shared';
import { ArrowLeft, Mail, MapPin, Phone, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { DeleteSupplierButton } from './delete-button';

export const metadata: Metadata = { title: 'Supplier' };

interface Supplier {
  id: string;
  name: string;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await apiFetch<Supplier>(`/suppliers/${id}`).catch(() => null);
  if (!supplier) notFound();

  const hasContact = supplier.mobile || supplier.email;

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/suppliers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Suppliers
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Truck className="size-7 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[32px] font-semibold leading-tight">{supplier.name}</h1>
          {supplier.contactPerson && <p className="mt-0.5 text-muted-foreground">{supplier.contactPerson}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline">
            <Link href={`/suppliers/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteSupplierButton id={id} name={supplier.name} />
        </div>
      </div>

      {/* Contact information */}
      {hasContact && (
        <Surface className="mt-6">
          <SurfaceHeader>
            <SurfaceTitle>Contact</SurfaceTitle>
          </SurfaceHeader>
          <SurfaceBody>
            <div className="space-y-3">
              {supplier.mobile && (
                <ContactItem icon={<Phone className="size-4" />} label="Mobile">
                  <a href={`tel:${supplier.mobile}`} className="hover:text-primary hover:underline">
                    {formatMobile(supplier.mobile)}
                  </a>
                </ContactItem>
              )}
              {supplier.email && (
                <ContactItem icon={<Mail className="size-4" />} label="Email">
                  <a href={`mailto:${supplier.email}`} className="hover:text-primary hover:underline">
                    {supplier.email}
                  </a>
                </ContactItem>
              )}
            </div>
          </SurfaceBody>
        </Surface>
      )}

      {/* Details */}
      {(supplier.address || supplier.notes) && (
        <Surface className="mt-4">
          <SurfaceHeader>
            <SurfaceTitle>Details</SurfaceTitle>
          </SurfaceHeader>
          <SurfaceBody>
            <dl className="grid gap-4">
              {supplier.address && (
                <Field label="Address">
                  <span className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {supplier.address}
                  </span>
                </Field>
              )}
              {supplier.notes && (
                <Field label="Notes">
                  <p className="whitespace-pre-wrap">{supplier.notes}</p>
                </Field>
              )}
            </dl>
          </SurfaceBody>
        </Surface>
      )}

      {/* Metadata */}
      <p className="mt-4 text-sm text-muted-foreground">
        Added {formatDate(supplier.createdAt)}
        {supplier.updatedAt !== supplier.createdAt && <> · Last updated {formatDate(supplier.updatedAt)}</>}
      </p>
    </div>
  );
}

function ContactItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div>
        <dt className="sr-only">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
