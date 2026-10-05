import { formatMeasure, type StockUnit, UNIT_SUFFIX } from '@yamban/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { ReceiveForm } from './receive-form';

export const metadata: Metadata = { title: 'Receive delivery' };

interface PurchaseRequestLineRow {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  shortageQuantity: string;
  purchaseQty: string;
  estimatedUnitCost: string;
  estimatedTotal: string;
  linkedOrders: { orderId: string; orderNumber: string; quantity: string }[];
}

interface PurchaseRequestDetail {
  id: string;
  prNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  status: string;
  lines: PurchaseRequestLineRow[];
}

export default async function ReceivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let pr: PurchaseRequestDetail;
  try {
    pr = await apiFetch<PurchaseRequestDetail>(`/purchase-requests/${id}`);
  } catch {
    notFound();
  }

  // Only allow receiving for PRINTED or ORDERED status
  if (pr.status !== 'PRINTED' && pr.status !== 'ORDERED') {
    redirect(`/purchase-requests/${id}`);
  }

  // Prepare lines for the form
  const formLines = pr.lines.map((line) => ({
    purchaseRequestLineId: line.id,
    materialId: line.materialId,
    materialName: line.materialName,
    materialColor: line.materialColor,
    materialUnit: line.materialUnit,
    purchaseUnit: line.purchaseUnit,
    purchaseQuantity: line.purchaseQuantity,
    expectedQuantity: line.purchaseQty,
    estimatedUnitCost: line.estimatedUnitCost,
  }));

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/purchase-requests/${id}`}>
            <ArrowLeft className="size-4" />
            Back to {pr.prNumber}
          </Link>
        </Button>
      </div>

      <PageHeader title="Receive delivery">
        <span className="text-muted-foreground">for {pr.prNumber}</span>
      </PageHeader>

      <ReceiveForm prId={id} prNumber={pr.prNumber} lines={formLines} />
    </div>
  );
}
