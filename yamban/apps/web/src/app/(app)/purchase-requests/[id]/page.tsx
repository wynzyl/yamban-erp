import {
  formatMoney,
  type Paginated,
  PURCHASE_REQUEST_STATUS_LABELS,
  type PurchaseRequestStatus,
  type StockUnit,
} from '@yamban/shared';
import { ArrowLeft, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { AddLineForm } from './add-line-form';
import { CancelButton } from './cancel-button';
import { EditableLine } from './editable-line';
import { EditDetailsForm } from './edit-details-form';
import { OrderedButton } from './ordered-button';
import { PrintButton } from './print-button';

export const metadata: Metadata = { title: 'Purchase request' };

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
  supplierContactPerson: string | null;
  supplierMobile: string | null;
  supplierEmail: string | null;
  supplierAddress: string | null;
  status: PurchaseRequestStatus;
  neededBy: string | null;
  notes: string | null;
  receivedAt: string | null;
  createdAt: string;
  lines: PurchaseRequestLineRow[];
}

interface MaterialOption {
  id: string;
  name: string;
  color: string | null;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  averageUnitCost: string;
}

export default async function PurchaseRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let pr: PurchaseRequestDetail;
  let materials: MaterialOption[] = [];
  try {
    pr = await apiFetch<PurchaseRequestDetail>(`/purchase-requests/${id}`);
    // Only fetch materials if PR can be edited
    if (pr.status === 'DRAFT' || pr.status === 'PRINTED') {
      const materialsData = await apiFetch<Paginated<MaterialOption>>('/materials?limit=500');
      materials = materialsData.items;
    }
  } catch {
    notFound();
  }

  function getStatusVariant(s: PurchaseRequestStatus) {
    switch (s) {
      case 'DRAFT':
        return 'outline';
      case 'PRINTED':
        return 'secondary';
      case 'ORDERED':
        return 'default';
      case 'RECEIVED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  const estimatedTotal = pr.lines.reduce((sum, line) => sum + parseFloat(line.estimatedTotal), 0);
  const canEdit = pr.status === 'DRAFT' || pr.status === 'PRINTED';
  const canPrint = pr.status === 'DRAFT';
  const canOrder = pr.status === 'PRINTED';
  const canReceive = pr.status === 'PRINTED' || pr.status === 'ORDERED';
  const canCancel = pr.status === 'DRAFT' || pr.status === 'PRINTED';

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchase-requests">
            <ArrowLeft className="size-4" />
            Back to purchase requests
          </Link>
        </Button>
      </div>

      <PageHeader title={pr.prNumber}>
        <div className="flex gap-2">
          <Badge variant={getStatusVariant(pr.status)}>
            {PURCHASE_REQUEST_STATUS_LABELS[pr.status]}
          </Badge>
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Surface className="p-4">
          <h3 className="font-medium">Supplier</h3>
          {pr.supplierName ? (
            <div className="mt-2 space-y-1 text-sm">
              <p className="font-medium">{pr.supplierName}</p>
              {pr.supplierContactPerson && <p className="text-muted-foreground">{pr.supplierContactPerson}</p>}
              {pr.supplierMobile && <p className="text-muted-foreground">{pr.supplierMobile}</p>}
              {pr.supplierEmail && <p className="text-muted-foreground">{pr.supplierEmail}</p>}
              {pr.supplierAddress && <p className="text-muted-foreground">{pr.supplierAddress}</p>}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No supplier assigned</p>
          )}
        </Surface>

        <Surface className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Details</h3>
            {canEdit && (
              <EditDetailsForm
                prId={pr.id}
                currentNeededBy={pr.neededBy}
                currentNotes={pr.notes}
              />
            )}
          </div>
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(pr.createdAt).toLocaleDateString('en-PH')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Needed by</span>
              <span>{pr.neededBy ? new Date(pr.neededBy).toLocaleDateString('en-PH') : '—'}</span>
            </div>
            {pr.receivedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received</span>
                <span>{new Date(pr.receivedAt).toLocaleDateString('en-PH')}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Est. total</span>
              <span className="font-medium">{formatMoney(estimatedTotal.toFixed(2))}</span>
            </div>
          </div>
          {pr.notes && (
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{pr.notes}</p>
            </div>
          )}
        </Surface>
      </div>

      <Surface className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
          <h2 className="font-medium">Materials ({pr.lines.length})</h2>
          {canEdit && <AddLineForm prId={pr.id} materials={materials} />}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Shortage</TableHead>
              <TableHead className="text-right">Purchase qty</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {canEdit && <TableHead className="w-20"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pr.lines.map((line) => (
              <EditableLine key={line.id} prId={pr.id} line={line} canEdit={canEdit} />
            ))}
          </TableBody>
        </Table>
      </Surface>

      <div className="mt-6 flex justify-between">
        <div>
          {canCancel && <CancelButton id={pr.id} />}
        </div>
        <div className="flex gap-2">
          {canPrint && <PrintButton id={pr.id} />}
          {canOrder && <OrderedButton id={pr.id} />}
          {canReceive && (
            <Button asChild>
              <Link href={`/purchase-requests/${pr.id}/receive`}>
                <Truck className="size-4" />
                Receive delivery
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
