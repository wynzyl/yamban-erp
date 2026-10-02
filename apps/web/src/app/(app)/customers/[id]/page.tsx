import { formatDate, formatMobile } from '@yamban/shared';
import { ArrowLeft, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CustomerAvatar } from '@/components/domain/customer-avatar';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { DeleteCustomerButton } from './delete-button';

export const metadata: Metadata = { title: 'Customer' };

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  organizationId: string | null;
  organizationName: string | null;
  mobile: string | null;
  email: string | null;
  facebook: string | null;
  birthday: string | null;
  streetPurok: string | null;
  barangay: string | null;
  municipality: string | null;
  province: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await apiFetch<Customer>(`/customers/${id}`).catch(() => null);
  if (!customer) notFound();

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  const address = [customer.streetPurok, customer.barangay, customer.municipality, customer.province]
    .filter(Boolean)
    .join(', ');

  const hasContact = customer.mobile || customer.email || customer.facebook;

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/customers"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Customers
      </Link>

      {/* Header with avatar */}
      <div className="flex items-start gap-4">
        <CustomerAvatar firstName={customer.firstName} lastName={customer.lastName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[32px] font-semibold leading-tight">{fullName}</h1>
          {customer.organizationName && <p className="mt-0.5 text-muted-foreground">{customer.organizationName}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline">
            <Link href={`/customers/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteCustomerButton id={id} name={fullName} />
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
              {customer.mobile && (
                <ContactItem icon={<Phone className="size-4" />} label="Mobile">
                  <a href={`tel:${customer.mobile}`} className="hover:text-primary hover:underline">
                    {formatMobile(customer.mobile)}
                  </a>
                </ContactItem>
              )}
              {customer.email && (
                <ContactItem icon={<Mail className="size-4" />} label="Email">
                  <a href={`mailto:${customer.email}`} className="hover:text-primary hover:underline">
                    {customer.email}
                  </a>
                </ContactItem>
              )}
              {customer.facebook && (
                <ContactItem icon={<MessageCircle className="size-4" />} label="Facebook">
                  {customer.facebook}
                </ContactItem>
              )}
            </div>
          </SurfaceBody>
        </Surface>
      )}

      {/* Details */}
      <Surface className="mt-4">
        <SurfaceHeader>
          <SurfaceTitle>Details</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            {customer.birthday && (
              <Field label="Birthday">
                {formatDate(customer.birthday)}
              </Field>
            )}
            {address && (
              <Field label="Address" wide>
                <span className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {address}
                </span>
              </Field>
            )}
            {customer.notes && (
              <Field label="Notes" wide>
                <p className="whitespace-pre-wrap">{customer.notes}</p>
              </Field>
            )}
            {!customer.birthday && !address && !customer.notes && (
              <p className="text-muted-foreground sm:col-span-2">No additional details.</p>
            )}
          </dl>
        </SurfaceBody>
      </Surface>

      {/* Metadata */}
      <p className="mt-4 text-sm text-muted-foreground">
        Added {formatDate(customer.createdAt)}
        {customer.updatedAt !== customer.createdAt && <> · Last updated {formatDate(customer.updatedAt)}</>}
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

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}
