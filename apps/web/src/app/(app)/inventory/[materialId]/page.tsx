import {
  formatMeasure,
  INVENTORY_TXN_TYPE_LABELS,
  type InventoryTxnType,
  type StockUnit,
  UNIT_SUFFIX,
} from '@yamban/shared';
import { ArrowLeft, Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Material stock' };

interface TransactionRow {
  id: string;
  materialId: string;
  materialName: string;
  materialColor: string | null;
  materialUnit: StockUnit;
  type: InventoryTxnType;
  quantity: string;
  unitCost: string;
  supplierName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  reference: string | null;
  transactionDate: string;
  createdAt: string;
}

interface MaterialStockDetail {
  id: string;
  name: string;
  color: string | null;
  category: string;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  stockOnHand: string;
  reservedQuantity: string;
  availableQuantity: string;
  averageUnitCost: string;
  reorderLevel: string;
  supplierName: string | null;
  recentTransactions: TransactionRow[];
}

export default async function MaterialStockPage({
  params,
}: {
  params: Promise<{ materialId: string }>;
}) {
  const { materialId } = await params;

  let material: MaterialStockDetail;
  try {
    material = await apiFetch<MaterialStockDetail>(`/inventory/stock/${materialId}`);
  } catch {
    notFound();
  }

  const unitSuffix = UNIT_SUFFIX[material.unit];
  const available = parseFloat(material.availableQuantity);
  const reorder = parseFloat(material.reorderLevel);
  const isLow = available <= reorder;
  const isShort = available < 0;

  function getBadgeVariant(txnType: InventoryTxnType) {
    switch (txnType) {
      case 'PURCHASE':
        return 'success';
      case 'ORDER_CONSUMPTION':
        return 'default';
      case 'RETURN':
        return 'secondary';
      case 'ADJUSTMENT':
        return 'outline';
      case 'WASTE':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inventory">
            <ArrowLeft className="size-4" />
            Back to inventory
          </Link>
        </Button>
      </div>

      <PageHeader
        title={material.color ? `${material.name} (${material.color})` : material.name}
      >
        <div className="flex gap-2">
          {isShort ? (
            <Badge variant="destructive">Short</Badge>
          ) : isLow ? (
            <Badge variant="warning">Low stock</Badge>
          ) : (
            <Badge variant="success">In stock</Badge>
          )}
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Stock on hand</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {formatMeasure(material.stockOnHand, unitSuffix)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Reserved</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
            {formatMeasure(material.reservedQuantity, unitSuffix)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${isShort ? 'text-destructive' : isLow ? 'text-warning' : ''}`}>
            {formatMeasure(material.availableQuantity, unitSuffix)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Avg unit cost</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {parseFloat(material.averageUnitCost).toLocaleString('en-PH', {
              style: 'currency',
              currency: 'PHP',
              minimumFractionDigits: 4,
            })}
          </p>
        </Surface>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Reorder level</p>
          <p className="mt-1 font-medium">{formatMeasure(material.reorderLevel, unitSuffix)}</p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Purchase unit</p>
          <p className="mt-1 font-medium">
            1 {material.purchaseUnit} = {formatMeasure(material.purchaseQuantity, unitSuffix)}
          </p>
        </Surface>
      </div>

      <Surface className="mt-6 overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <h2 className="font-medium">Recent transactions</h2>
        </div>
        {material.recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Package className="size-8" strokeWidth={1.5} />
            <p>No transactions yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {material.recentTransactions.map((txn) => {
                const qty = parseFloat(txn.quantity);
                const isPositive = qty > 0;

                return (
                  <TableRow key={txn.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(txn.transactionDate).toLocaleDateString('en-PH')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(txn.type)}>
                        {INVENTORY_TXN_TYPE_LABELS[txn.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={isPositive ? 'text-success' : 'text-destructive'}>
                        {isPositive ? '+' : ''}
                        {formatMeasure(txn.quantity, unitSuffix)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {txn.orderNumber ? (
                        <Link href={`/orders/${txn.orderId}`} className="hover:text-primary hover:underline">
                          {txn.orderNumber}
                        </Link>
                      ) : txn.supplierName ? (
                        txn.supplierName
                      ) : txn.reference ? (
                        txn.reference
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Surface>

      <div className="mt-4">
        <Button variant="outline" asChild>
          <Link href={`/inventory/transactions?materialId=${material.id}`}>View all transactions</Link>
        </Button>
      </div>
    </div>
  );
}
