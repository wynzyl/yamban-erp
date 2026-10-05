import { formatMeasure, type StockUnit, UNIT_SUFFIX } from '@yamban/shared';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { BuildFromShortagesButton } from '../build-from-shortages-button';

export const metadata: Metadata = { title: 'Material shortages' };

interface ShortageInfo {
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  supplierId: string | null;
  supplierName: string | null;
  stockOnHand: string;
  reserved: string;
  available: string;
  shortage: string;
  averageUnitCost: string;
  linkedOrders: { orderId: string; orderNumber: string; quantity: string }[];
}

export default async function ShortagesPage() {
  const shortages = await apiFetch<ShortageInfo[]>('/purchase-requests/shortages');

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchase-requests">
            <ArrowLeft className="size-4" />
            Back to purchase requests
          </Link>
        </Button>
      </div>

      <PageHeader title="Material shortages" count={shortages.length}>
        {shortages.length > 0 && <BuildFromShortagesButton />}
      </PageHeader>

      <Surface className="mt-6 overflow-hidden">
        {shortages.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="size-10" strokeWidth={1.5} />}
            message="No shortages detected."
            action="All materials are adequately stocked."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Shortage</TableHead>
                <TableHead>Linked orders</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shortages.map((s) => {
                const unitSuffix = UNIT_SUFFIX[s.materialUnit];
                const hasOrders = s.linkedOrders.length > 0;
                return (
                  <TableRow key={s.materialId}>
                    <TableCell>
                      <Link
                        href={`/inventory/${s.materialId}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {s.materialName}
                        {s.materialColor && (
                          <span className="ml-1 text-muted-foreground">({s.materialColor})</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.supplierName ?? 'No supplier'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMeasure(s.stockOnHand, unitSuffix)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMeasure(s.reserved, unitSuffix)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="text-destructive">{formatMeasure(s.shortage, unitSuffix)}</span>
                    </TableCell>
                    <TableCell>
                      {hasOrders ? (
                        <div className="flex flex-wrap gap-1">
                          {s.linkedOrders.slice(0, 3).map((order) => (
                            <Link
                              key={order.orderId}
                              href={`/orders/${order.orderId}`}
                              className="text-xs text-muted-foreground hover:text-primary hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                          ))}
                          {s.linkedOrders.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{s.linkedOrders.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="warning">Low stock</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Surface>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          <strong>Shortages</strong> are detected when:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Materials are reserved by confirmed orders but insufficient stock is available</li>
          <li>Materials are at or below their reorder level</li>
        </ul>
      </div>
    </div>
  );
}
