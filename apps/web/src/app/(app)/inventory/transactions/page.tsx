import {
  formatMeasure,
  INVENTORY_TXN_TYPE_LABELS,
  type InventoryTxnType,
  type Paginated,
  type StockUnit,
  UNIT_SUFFIX,
} from '@yamban/shared';
import { ArrowLeft, ScrollText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Inventory transactions' };

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

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; materialId?: string }>;
}) {
  const { page = '1', type, materialId } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (type) qs.set('type', type);
  if (materialId) qs.set('materialId', materialId);

  const data = await apiFetch<Paginated<TransactionRow>>(`/inventory?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (materialId) params.set('materialId', materialId);
    params.set('page', String(p));
    return `?${params}`;
  }

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
    <div className="max-w-6xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inventory">
            <ArrowLeft className="size-4" />
            Back to inventory
          </Link>
        </Button>
      </div>

      <PageHeader title="Inventory transactions" count={data.total} />

      <Surface className="mt-6 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="size-10" strokeWidth={1.5} />}
            message="No transactions yet."
            action="Transactions will appear as stock changes."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((txn) => {
                const unitSuffix = UNIT_SUFFIX[txn.materialUnit];
                const qty = parseFloat(txn.quantity);
                const isPositive = qty > 0;

                return (
                  <TableRow key={txn.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(txn.transactionDate).toLocaleDateString('en-PH')}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/inventory/${txn.materialId}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {txn.materialName}
                        {txn.materialColor && (
                          <span className="ml-1 text-muted-foreground">({txn.materialColor})</span>
                        )}
                      </Link>
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total > 0 && (
            <>
              Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of{' '}
              {data.total.toLocaleString()}
            </>
          )}
        </p>
        <Pagination currentPage={data.page} totalPages={totalPages} getPageUrl={getPageUrl} />
      </div>
    </div>
  );
}
