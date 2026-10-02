import {
  formatDate,
  formatMeasure,
  formatMoney,
  MATERIAL_CATEGORY_LABELS,
  UNIT_SUFFIX,
  type StockUnit,
} from '@yamban/shared';
import { ArrowLeft, Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { DeleteMaterialButton } from './delete-button';
import { StockBadge } from '../stock-badge';

export const metadata: Metadata = { title: 'Material' };

interface Material {
  id: string;
  name: string;
  color: string | null;
  category: string;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  defaultSupplierId: string | null;
  supplierName: string | null;
  reorderLevel: string;
  stockOnHand: string;
  averageUnitCost: string;
  createdAt: string;
  updatedAt: string;
}

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const material = await apiFetch<Material>(`/materials/${id}`).catch(() => null);
  if (!material) notFound();

  const unitSuffix = UNIT_SUFFIX[material.unit];
  const stock = parseFloat(material.stockOnHand);
  const reorder = parseFloat(material.reorderLevel);
  const categoryLabel =
    MATERIAL_CATEGORY_LABELS[material.category as keyof typeof MATERIAL_CATEGORY_LABELS] ?? material.category;

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/materials"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Materials
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Package className="size-7 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[32px] font-semibold leading-tight">
            {material.name}
            {material.color && <span className="ml-2 text-muted-foreground">({material.color})</span>}
          </h1>
          <p className="mt-0.5 text-muted-foreground">{categoryLabel}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline">
            <Link href={`/materials/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteMaterialButton id={id} name={material.name} />
        </div>
      </div>

      {/* Stock Information */}
      <Surface className="mt-6">
        <SurfaceHeader>
          <SurfaceTitle>Stock</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="On hand">
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{formatMeasure(material.stockOnHand, unitSuffix)}</span>
                <StockBadge stock={stock} reorderLevel={reorder} />
              </span>
            </Field>
            <Field label="Reorder level">
              <span className="tabular-nums">
                {reorder > 0 ? formatMeasure(material.reorderLevel, unitSuffix) : '—'}
              </span>
            </Field>
            <Field label="Average unit cost">
              <span className="yb-money">{formatMoney(material.averageUnitCost)}</span>
              <span className="ml-1 text-muted-foreground">per {unitSuffix}</span>
            </Field>
          </dl>
        </SurfaceBody>
      </Surface>

      {/* Purchase Details */}
      <Surface className="mt-4">
        <SurfaceHeader>
          <SurfaceTitle>Purchase details</SurfaceTitle>
        </SurfaceHeader>
        <SurfaceBody>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Purchase unit">{material.purchaseUnit}</Field>
            <Field label="Quantity per purchase">
              <span className="tabular-nums">{formatMeasure(material.purchaseQuantity, unitSuffix)}</span>
            </Field>
            <Field label="Default supplier">{material.supplierName ?? '—'}</Field>
          </dl>
        </SurfaceBody>
      </Surface>

      {/* Metadata */}
      <p className="mt-4 text-sm text-muted-foreground">
        Added {formatDate(material.createdAt)}
        {material.updatedAt !== material.createdAt && <> · Last updated {formatDate(material.updatedAt)}</>}
      </p>
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
