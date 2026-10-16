'use client';

import { formatDate, formatMoney, ORDER_STATUS_LABELS, type OrderStatus } from '@yamban/shared';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProductUsageStats {
  totalOrders: number;
  totalRevenue: string;
  totalQuantitySold: number;
  lastUsedDate: string | null;
}

interface ProductOrderUsage {
  id: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  quantity: number;
  subtotal: string;
}

interface ProductUsageProps {
  productId: string;
  productName: string;
}

export function ProductUsage({ productId, productName }: ProductUsageProps) {
  const [stats, setStats] = useState<ProductUsageStats | null>(null);
  const [orders, setOrders] = useState<ProductOrderUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          fetch(`/api/products/${productId}/usage-stats`, { credentials: 'include' }),
          fetch(`/api/products/${productId}/order-usage`, { credentials: 'include' }),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data ?? statsData);
        }
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.data ?? ordersData);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [productId]);

  return (
    <>
      {/* Usage Summary */}
      <Surface className="mt-6">
        <SurfaceHeader className="flex items-center justify-between">
          <SurfaceTitle>Usage</SurfaceTitle>
          <Button asChild size="sm" variant="outline">
            <Link href={`/orders/new?productId=${productId}`}>
              <Plus className="size-4" />
              New order
            </Link>
          </Button>
        </SurfaceHeader>
        <SurfaceBody>
          {loading ? (
            <div className="h-20 animate-pulse rounded bg-muted" />
          ) : stats ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-sm text-muted-foreground">Orders</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.totalOrders}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Revenue</dt>
                <dd className="yb-money mt-1 text-2xl font-semibold">{formatMoney(stats.totalRevenue)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Quantity sold</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{stats.totalQuantitySold.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Last used</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {stats.lastUsedDate ? formatDate(stats.lastUsedDate) : '—'}
                </dd>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load usage stats.</p>
          )}
        </SurfaceBody>
      </Surface>

      {/* Order History */}
      <Surface className="mt-4 overflow-hidden">
        <SurfaceHeader>
          <SurfaceTitle>Recent orders</SurfaceTitle>
        </SurfaceHeader>
        {loading ? (
          <div className="p-4">
            <div className="h-32 animate-pulse rounded bg-muted" />
          </div>
        ) : orders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">This product hasn't been used in any orders yet.</p>
            <Button asChild size="sm" className="mt-4">
              <Link href={`/orders/new?productId=${productId}`}>
                <Plus className="size-4" />
                Create order with this product
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-display font-semibold text-foreground hover:text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{order.customerName}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(order.orderDate)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{ORDER_STATUS_LABELS[order.status]}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{order.quantity}</TableCell>
                  <TableCell className="text-right">
                    <Money value={order.subtotal} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>
    </>
  );
}
