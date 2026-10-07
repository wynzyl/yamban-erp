'use client';

import { formatDate, formatMoney, type OrderStatus } from '@yamban/shared';
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Money } from '@/components/domain/money';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';

interface OrderCostSummary {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  revenue: string;
  materialCost: string;
  electricityCost: string;
  laborCost: string;
  totalCost: string;
  profit: string;
  marginPercent: string;
  isEstimated: boolean;
  variance: string | null;
}

interface MaterialCostLine {
  materialId: string;
  materialName: string;
  materialColor: string | null;
  quantity: string;
  unit: string;
  unitCost: string;
  totalCost: string;
}

interface ElectricityCostLine {
  machineId: string;
  machineName: string;
  stage: string;
  totalMinutes: number;
  powerKw: string;
  kwh: string;
  rate: string;
  totalCost: string;
}

interface LaborCostLine {
  stage: string;
  quantity: number;
  ratePerPiece: string;
  totalCost: string;
}

interface OrderCostDetail {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
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

interface ExpandableOrderRowProps {
  order: OrderCostSummary;
}

export function ExpandableOrderRow({ order }: ExpandableOrderRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<OrderCostDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const profit = parseFloat(order.profit);
  const margin = parseFloat(order.marginPercent);
  const isProfitable = profit >= 0;
  const variance = order.variance ? parseFloat(order.variance) : null;

  async function handleToggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (!detail) {
      setLoading(true);
      try {
        const res = await fetch(`/api/costing/orders/${order.orderId}`);
        if (res.ok) {
          const body = (await res.json()) as { data: OrderCostDetail };
          setDetail(body.data);
        }
      } catch {
        // Ignore errors, row just won't expand
      } finally {
        setLoading(false);
      }
    }
    setExpanded(true);
  }

  return (
    <>
      <TableRow
        className="group cursor-pointer"
        onClick={handleToggle}
      >
        <TableCell>
          <span className="inline-flex items-center gap-1">
            {expanded ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">
              {order.orderNumber}
            </span>
          </span>
          <p className="ml-5 text-xs text-muted-foreground">
            {formatDate(order.orderDate)}
          </p>
        </TableCell>
        <TableCell>{order.customerName}</TableCell>
        <TableCell className="text-right tabular-nums">
          <Money value={order.revenue} />
        </TableCell>
        <TableCell className="text-right tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Money value={order.totalCost} />
            {order.isEstimated && (
              <span className="text-xs text-warning" title="Estimated cost">
                est.
              </span>
            )}
          </span>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          <span className={isProfitable ? 'text-success' : 'text-destructive'}>
            <Money value={order.profit} />
          </span>
        </TableCell>
        <TableCell className="text-right">
          <Badge
            variant={margin >= 30 ? 'success' : margin >= 15 ? 'warning' : 'destructive'}
            className="tabular-nums"
          >
            {isProfitable ? (
              <TrendingUp className="mr-1 size-3" />
            ) : (
              <TrendingDown className="mr-1 size-3" />
            )}
            {margin.toFixed(1)}%
          </Badge>
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {variance !== null ? (
            <span className={variance <= 0 ? 'text-success' : 'text-destructive'}>
              {variance <= 0 ? '' : '+'}
              <Money value={order.variance!} />
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={7} className="p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading breakdown...</p>
            ) : detail ? (
              <CostBreakdown detail={detail} />
            ) : (
              <p className="text-sm text-muted-foreground">Could not load breakdown.</p>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function CostBreakdown({ detail }: { detail: OrderCostDetail }) {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {/* Materials */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className="text-sm font-medium">Materials</h4>
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatMoney(detail.materialCostTotal)}
          </span>
        </div>
        {detail.materialCosts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No materials</p>
        ) : (
          <ul className="space-y-1">
            {detail.materialCosts.map((m) => (
              <li key={m.materialId} className="flex justify-between text-xs">
                <span className="truncate">
                  {m.materialName}
                  {m.materialColor && ` (${m.materialColor})`}
                  <span className="ml-1 text-muted-foreground">
                    {m.quantity} {m.unit}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatMoney(m.totalCost)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Electricity */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className="text-sm font-medium">Electricity</h4>
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatMoney(detail.electricityCostTotal)}
          </span>
        </div>
        {detail.electricityCosts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No electricity usage</p>
        ) : (
          <ul className="space-y-1">
            {detail.electricityCosts.map((e, i) => (
              <li key={`${e.machineId}-${e.stage}-${i}`} className="flex justify-between text-xs">
                <span className="truncate">
                  {e.machineName}
                  <span className="ml-1 text-muted-foreground">
                    {e.totalMinutes}min · {e.kwh} kWh
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatMoney(e.totalCost)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Labor */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className="text-sm font-medium">Labor</h4>
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatMoney(detail.laborCostTotal)}
          </span>
        </div>
        {detail.laborCosts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No labor</p>
        ) : (
          <ul className="space-y-1">
            {detail.laborCosts.map((l) => (
              <li key={l.stage} className="flex justify-between text-xs">
                <span className="truncate">
                  {l.stage}
                  <span className="ml-1 text-muted-foreground">
                    {l.quantity} pcs @ {formatMoney(l.ratePerPiece)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatMoney(l.totalCost)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
