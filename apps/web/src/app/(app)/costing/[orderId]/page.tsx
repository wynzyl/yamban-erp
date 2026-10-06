import {
  formatMeasure,
  formatMoney,
  PRODUCTION_STAGE_LABELS,
  type ProductionStage,
  type StockUnit,
  UNIT_SUFFIX,
} from '@yamban/shared';
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';

export const metadata: Metadata = { title: 'Order cost breakdown' };

interface MaterialCostLine {
  materialId: string;
  materialName: string;
  materialColor: string | null;
  quantity: string;
  unit: StockUnit;
  unitCost: string;
  totalCost: string;
}

interface ElectricityCostLine {
  machineId: string;
  machineName: string;
  stage: ProductionStage;
  totalMinutes: number;
  powerKw: string;
  kwh: string;
  rate: string;
  totalCost: string;
}

interface LaborCostLine {
  stage: ProductionStage;
  quantity: number;
  ratePerPiece: string;
  totalCost: string;
}

interface OrderCostDetail {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  electricityRate: string | null;
  revenue: string;
  materialCosts: MaterialCostLine[];
  materialCostTotal: string;
  electricityCosts: ElectricityCostLine[];
  electricityCostTotal: string;
  laborCosts: LaborCostLine[];
  laborCostTotal: string;
  totalCost: string;
  profit: string;
  marginPercent: string;
}

export default async function OrderCostPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  let data: OrderCostDetail;
  try {
    data = await apiFetch<OrderCostDetail>(`/costing/orders/${orderId}`);
  } catch {
    notFound();
  }

  const profit = parseFloat(data.profit);
  const margin = parseFloat(data.marginPercent);
  const isProfitable = profit >= 0;

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/costing">
            <ArrowLeft className="size-4" />
            Back to costing
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[32px] font-semibold leading-tight">
            {data.orderNumber}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {data.customerName} · {new Date(data.orderDate).toLocaleDateString('en-PH')}
          </p>
        </div>
        <Badge
          variant={margin >= 30 ? 'success' : margin >= 15 ? 'warning' : 'destructive'}
          className="text-lg tabular-nums"
        >
          {isProfitable ? (
            <TrendingUp className="mr-1 size-4" />
          ) : (
            <TrendingDown className="mr-1 size-4" />
          )}
          {margin.toFixed(1)}% margin
        </Badge>
      </div>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-5">
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(data.revenue)}</p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Material cost</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
            {formatMoney(data.materialCostTotal)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Electricity cost</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
            {formatMoney(data.electricityCostTotal)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Labor cost</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
            {formatMoney(data.laborCostTotal)}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-sm text-muted-foreground">Profit</p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              isProfitable ? 'text-success' : 'text-destructive'
            }`}
          >
            {formatMoney(data.profit)}
          </p>
        </Surface>
      </div>

      {/* Material costs */}
      <Surface className="mt-6 overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <h2 className="font-medium">Material costs</h2>
        </div>
        {data.materialCosts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No material costs recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.materialCosts.map((m, i) => {
                const unitSuffix = UNIT_SUFFIX[m.unit];
                return (
                  <TableRow key={i}>
                    <TableCell>
                      {m.materialName}
                      {m.materialColor && (
                        <span className="ml-1 text-muted-foreground">({m.materialColor})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMeasure(m.quantity, unitSuffix)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatMoney(m.unitCost)}/{unitSuffix}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(m.totalCost)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={3} className="text-right font-medium">
                  Total materials
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatMoney(data.materialCostTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Surface>

      {/* Electricity costs */}
      <Surface className="mt-6 overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Electricity costs</h2>
            {data.electricityRate && (
              <span className="text-sm text-muted-foreground">
                Rate: {formatMoney(data.electricityRate)}/kWh
              </span>
            )}
          </div>
        </div>
        {data.electricityCosts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No machine processes recorded. Configure product processes to track electricity costs.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="text-right">kWh</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.electricityCosts.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{e.machineName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PRODUCTION_STAGE_LABELS[e.stage]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.totalMinutes.toFixed(1)} min
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {e.kwh} kWh
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(e.totalCost)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={4} className="text-right font-medium">
                  Total electricity
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatMoney(data.electricityCostTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Surface>

      {/* Labor costs */}
      <Surface className="mt-6 overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3">
          <h2 className="font-medium">Labor costs</h2>
        </div>
        {data.laborCosts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No labor costs recorded. Configure product labor rates to track labor costs.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Rate per piece</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.laborCosts.map((l, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant="outline">{PRODUCTION_STAGE_LABELS[l.stage]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.quantity} pcs</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatMoney(l.ratePerPiece)}/pc
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(l.totalCost)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30">
                <TableCell colSpan={3} className="text-right font-medium">
                  Total labor
                </TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatMoney(data.laborCostTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Surface>

      {/* View order link */}
      <div className="mt-6">
        <Button variant="outline" asChild>
          <Link href={`/orders/${data.orderId}`}>View order details</Link>
        </Button>
      </div>
    </div>
  );
}
