'use client';

import { formatDate, formatMoney, ORDER_STATUS_LABELS, type OrderStatus } from '@yamban/shared';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CollectPaymentModal, type OrderForPayment } from '@/components/domain/collect-payment-modal';
import { Money } from '@/components/domain/money';
import { PaymentChip } from '@/components/domain/payment-chip';
import { Button } from '@/components/ui/button';
import { Surface, SurfaceBody, SurfaceHeader, SurfaceTitle } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CustomerOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  dueDate: string | null;
  status: OrderStatus;
  total: string;
  paidAmount: string;
}

interface CustomerSummary {
  orderCount: number;
  totalSpent: string;
  totalPaid: string;
  outstandingBalance: string;
  unpaidOrderCount: number;
}

interface CustomerOrdersProps {
  customerId: string;
  customerName: string;
}

export function CustomerOrders({ customerId, customerName }: CustomerOrdersProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderForPayment | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, summaryRes] = await Promise.all([
          fetch(`/api/customers/${customerId}/orders`, { credentials: 'include' }),
          fetch(`/api/customers/${customerId}/summary`, { credentials: 'include' }),
        ]);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setOrders(ordersData.data ?? ordersData);
        }
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummary(summaryData.data ?? summaryData);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [customerId]);

  const handleCollectPayment = (order: CustomerOrder) => {
    setSelectedOrder({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      paidAmount: order.paidAmount,
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    // Refresh the data
    setLoading(true);
    Promise.all([
      fetch(`/api/customers/${customerId}/orders`, { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/customers/${customerId}/summary`, { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]).then(([ordersData, summaryData]) => {
      if (ordersData) setOrders(ordersData.data ?? ordersData);
      if (summaryData) setSummary(summaryData.data ?? summaryData);
      setLoading(false);
    });
  };

  const hasOutstandingBalance = summary && parseFloat(summary.outstandingBalance) > 0;

  return (
    <>
      {/* Account Summary */}
      <Surface className="mt-6">
        <SurfaceHeader className="flex items-center justify-between">
          <SurfaceTitle>Account</SurfaceTitle>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/orders/new?customerId=${customerId}`}>
                <Plus className="size-4" />
                New order
              </Link>
            </Button>
          </div>
        </SurfaceHeader>
        <SurfaceBody>
          {loading ? (
            <div className="h-20 animate-pulse rounded bg-muted" />
          ) : summary ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-sm text-muted-foreground">Orders</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{summary.orderCount}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Total spent</dt>
                <dd className="yb-money mt-1 text-2xl font-semibold">{formatMoney(summary.totalSpent)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Total paid</dt>
                <dd className="yb-money mt-1 text-2xl font-semibold">{formatMoney(summary.totalPaid)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Outstanding</dt>
                <dd className="mt-1 flex items-baseline gap-2">
                  <span className="yb-money text-2xl font-semibold">
                    {formatMoney(summary.outstandingBalance)}
                  </span>
                  {summary.unpaidOrderCount > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({summary.unpaidOrderCount} {summary.unpaidOrderCount === 1 ? 'order' : 'orders'})
                    </span>
                  )}
                </dd>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load account summary.</p>
          )}
        </SurfaceBody>
      </Surface>

      {/* Order History */}
      <Surface className="mt-4 overflow-hidden">
        <SurfaceHeader>
          <SurfaceTitle>Orders</SurfaceTitle>
        </SurfaceHeader>
        {loading ? (
          <div className="p-4">
            <div className="h-32 animate-pulse rounded bg-muted" />
          </div>
        ) : orders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No orders yet.</p>
            <Button asChild size="sm" className="mt-4">
              <Link href={`/orders/new?customerId=${customerId}`}>
                <Plus className="size-4" />
                Create first order
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const balance = parseFloat(order.total) - parseFloat(order.paidAmount);
                const canCollect = balance > 0 && order.status !== 'QUOTATION' && order.status !== 'CANCELLED';

                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-display font-semibold text-foreground hover:text-primary hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(order.orderDate)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{ORDER_STATUS_LABELS[order.status]}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Money value={order.total} />
                    </TableCell>
                    <TableCell>
                      <PaymentChip total={order.total} paid={order.paidAmount} />
                    </TableCell>
                    <TableCell>
                      {canCollect && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCollectPayment(order)}
                        >
                          Collect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Surface>

      {/* Payment Modal */}
      {selectedOrder && (
        <CollectPaymentModal
          order={selectedOrder}
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
