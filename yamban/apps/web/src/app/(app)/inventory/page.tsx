import { formatMeasure, UNIT_SUFFIX, type StockUnit } from '@yamban/shared';
import { Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Inventory' };

interface StockSummaryRow {
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
}

export default async function InventoryPage() {
  const data = await apiFetch<StockSummaryRow[]>('/inventory/stock');

  // Group by category
  const byCategory = new Map<string, StockSummaryRow[]>();
  for (const item of data) {
    const arr = byCategory.get(item.category) ?? [];
    arr.push(item);
    byCategory.set(item.category, arr);
  }

  return (
    <div className="max-w-6xl">
      <PageHeader title="Inventory" count={data.length}>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/inventory/transactions">View transactions</Link>
          </Button>
        </div>
      </PageHeader>

      {data.length === 0 ? (
        <Surface className="mt-6">
          <EmptyState
            icon={<Package className="size-10" strokeWidth={1.5} />}
            message="No materials in inventory."
            action="Add materials first."
          >
            <Button asChild size="sm">
              <Link href="/materials/new">Add material</Link>
            </Button>
          </EmptyState>
        </Surface>
      ) : (
        <div className="mt-6 space-y-6">
          {Array.from(byCategory.entries()).map(([category, items]) => (
            <Surface key={category} className="overflow-hidden">
              <div className="border-b bg-muted/50 px-4 py-2">
                <h2 className="font-medium">{category}</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead className="text-right">Reserved</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Avg cost</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m) => {
                    const unitSuffix = UNIT_SUFFIX[m.unit];
                    const available = parseFloat(m.availableQuantity);
                    const reorder = parseFloat(m.reorderLevel);
                    const isLow = available <= reorder;
                    const isShort = available < 0;

                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Link
                            href={`/inventory/${m.id}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {m.name}
                            {m.color && <span className="ml-1 text-muted-foreground">({m.color})</span>}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMeasure(m.stockOnHand, unitSuffix)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatMeasure(m.reservedQuantity, unitSuffix)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={isShort ? 'text-destructive' : isLow ? 'text-warning' : ''}>
                            {formatMeasure(m.availableQuantity, unitSuffix)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {parseFloat(m.averageUnitCost).toLocaleString('en-PH', {
                            style: 'currency',
                            currency: 'PHP',
                            minimumFractionDigits: 4,
                          })}
                        </TableCell>
                        <TableCell>
                          {isShort ? (
                            <Badge variant="destructive">Short</Badge>
                          ) : isLow ? (
                            <Badge variant="warning">Low</Badge>
                          ) : (
                            <Badge variant="success">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
