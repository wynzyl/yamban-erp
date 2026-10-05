import { formatDate, formatMoney, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PRODUCTION_STAGE_LABELS, SIZE_LABELS, type EditPermissions, type OrderStatus, type PaymentMethod, type ProductionStage } from '@yamban/shared';
import { ArrowLeft, Calendar, Edit, Package, Palette, Plus, User, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Money } from '@/components/domain/money';
import { PaymentChip } from '@/components/domain/payment-chip';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { StatusBadge } from '../status-badge';
import { DeleteOrderButton } from './delete-button';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const order = await apiFetch<{ orderNumber: string }>(`/orders/${id}`);
    return { title: `Order ${order.orderNumber}` };
  } catch {
    return { title: 'Order not found' };
  }
}

interface OrderItemSize {
  id: string;
  orderItemId: string;
  size: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface RosterEntry {
  id: string;
  orderItemId: string;
  playerName: string;
  jerseyNumber: string | null;
  size: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string | null;
  quantity: number;
  subtotal: string;
  sizes: OrderItemSize[];
  roster: RosterEntry[];
}

interface Payment {
  id: string;
  paymentDate: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

interface ProductionJob {
  id: string;
  orderItemId: string;
  stage: ProductionStage;
  sequence: number;
  status: string;
  designJobId: string | null;
  designApprovalStatus: string | null;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  customerId: string;
  customerFirstName: string;
  customerLastName: string;
  customerMobile: string | null;
  organizationId: string | null;
  organizationName: string | null;
  orderDate: string;
  dueDate: string | null;
  status: OrderStatus;
  materialStatus: string;
  subtotal: string;
  discount: string;
  total: string;
  notes: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
  productionJobs: ProductionJob[];
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order: OrderDetail;
  let permissions: EditPermissions;
  try {
    const [orderData, permsData] = await Promise.all([
      apiFetch<OrderDetail>(`/orders/${id}`),
      apiFetch<EditPermissions>(`/orders/${id}/edit-permissions`),
    ]);
    order = orderData;
    permissions = permsData;
  } catch {
    notFound();
  }

  const customerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ');
  const paidAmount = order.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const balance = parseFloat(order.total) - paidAmount;

  return (
    <div className="max-w-4xl">
      <div className="mb-4">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to orders
        </Link>
      </div>

      <PageHeader title={`Order ${order.orderNumber}`}>
        <div className="flex items-center gap-2">
          {order.status === 'QUOTATION' && <DeleteOrderButton id={order.id} />}
          {permissions.canAddItems && (
            <Button asChild variant="outline">
              <Link href={`/orders/${order.id}/items/new`}>
                <Plus className="size-4" />
                Add item
              </Link>
            </Button>
          )}
          {permissions.canFullEdit && (
            <Button asChild variant="outline">
              <Link href={`/orders/${order.id}/edit`}>
                <Edit className="size-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {/* Order Info */}
        <Surface className="p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Order details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <StatusBadge status={order.status} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Order date</dt>
              <dd>{formatDate(order.orderDate)}</dd>
            </div>
            {order.dueDate && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Due date</dt>
                <dd className="flex items-center gap-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {formatDate(order.dueDate)}
                </dd>
              </div>
            )}
            {order.confirmedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Confirmed</dt>
                <dd>{formatDate(order.confirmedAt)}</dd>
              </div>
            )}
          </dl>
        </Surface>

        {/* Customer Info */}
        <Surface className="p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Customer</h2>
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <User className="size-5 text-muted-foreground" />
            </div>
            <div>
              <Link
                href={`/customers/${order.customerId}`}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {customerName}
              </Link>
              {order.organizationName && (
                <p className="text-sm text-muted-foreground">{order.organizationName}</p>
              )}
              {order.customerMobile && (
                <p className="text-sm text-muted-foreground">{order.customerMobile}</p>
              )}
            </div>
          </div>
        </Surface>

        {/* Payment Summary */}
        <Surface className="p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Payment</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Balance</dt>
              <dd>
                <Money value={balance} className="font-semibold" />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd>
                <Money value={order.total} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paid</dt>
              <dd>
                <Money value={paidAmount} />
              </dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <PaymentChip total={order.total} paid={paidAmount} />
              </dd>
            </div>
          </dl>
        </Surface>
      </div>

      {/* Order Items */}
      <Surface className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium">Items ({order.items.length})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              {(permissions.canEditRoster || permissions.canEditPrices) && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-muted-foreground" />
                    <span className="font-medium">{item.productName}</span>
                  </div>
                  {item.sizes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5 pl-6">
                      {item.sizes.map((s) => (
                        <span
                          key={s.id}
                          className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                        >
                          {s.size}: {s.quantity} @ <span className="yb-money">{formatMoney(s.unitPrice)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {item.roster && item.roster.length > 0 && (
                    <details className="mt-2 pl-6">
                      <summary className="cursor-pointer text-xs text-muted-foreground">
                        Roster ({item.roster.length} player{item.roster.length !== 1 ? 's' : ''})
                      </summary>
                      <div className="mt-1 space-y-1">
                        {/* Group roster by unique sizes */}
                        {Array.from(new Set(item.roster.map((r) => r.size))).map((size) => {
                          const playersInSize = item.roster.filter((r) => r.size === size);
                          return (
                            <div key={size} className="text-xs">
                              <span className="font-medium text-muted-foreground">{SIZE_LABELS[size as keyof typeof SIZE_LABELS] || size}:</span>
                              <span className="ml-1 text-foreground">
                                {playersInSize.map((r, idx) => (
                                  <span key={r.id}>
                                    {idx > 0 && ', '}
                                    {r.jerseyNumber && <span className="font-mono">#{r.jerseyNumber} </span>}
                                    {r.playerName}
                                  </span>
                                ))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.description ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  <Money value={item.subtotal} />
                </TableCell>
                {(permissions.canEditRoster || permissions.canEditPrices) && (
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {permissions.canEditRoster && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/orders/${order.id}/items/${item.id}/roster`}>
                            <Users className="size-3.5" />
                            Roster
                          </Link>
                        </Button>
                      )}
                      {permissions.canEditPrices && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/orders/${order.id}/items/${item.id}/prices`}>
                            <Edit className="size-3.5" />
                            Edit
                          </Link>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-border px-4 py-3">
          <dl className="ml-auto w-48 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>
                <Money value={order.subtotal} />
              </dd>
            </div>
            {parseFloat(order.discount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Discount</dt>
                <dd>
                  <Money value={`-${order.discount}`} negativeIsProblem={false} />
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-medium">
              <dt>Total</dt>
              <dd>
                <Money value={order.total} />
              </dd>
            </div>
          </dl>
        </div>
      </Surface>

      {/* Production Status */}
      {order.productionJobs.length > 0 && (
        <Surface className="mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-medium">Production</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => {
                const itemJobs = order.productionJobs.filter((j) => j.orderItemId === item.id);
                return itemJobs.map((job, idx) => (
                  <TableRow key={job.id}>
                    {idx === 0 && (
                      <TableCell rowSpan={itemJobs.length} className="align-top">
                        <span className="font-medium">{item.productName}</span>
                      </TableCell>
                    )}
                    <TableCell>{PRODUCTION_STAGE_LABELS[job.stage]}</TableCell>
                    <TableCell>
                      {job.stage === 'DESIGN' && job.designApprovalStatus ? (
                        <span className="text-muted-foreground">{job.designApprovalStatus}</span>
                      ) : (
                        <span className="text-muted-foreground">{job.status}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.stage === 'DESIGN' && job.designJobId && (
                        <Link
                          href={`/production/design/${job.designJobId}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <Palette className="size-3.5" />
                          View
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </Surface>
      )}

      {/* Payments */}
      <Surface className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium">Payments ({order.payments.length})</h2>
          <Button asChild size="sm">
            <Link href={`/payments/new?orderId=${order.id}`}>
              <Plus className="size-4" />
              Record payment
            </Link>
          </Button>
        </div>
        {order.payments.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(p.paymentDate)}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                  <TableCell className="text-muted-foreground">{p.reference ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Money value={p.amount} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>

      {/* Notes */}
      <Surface className="mt-6 p-4">
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Notes</h2>
          {permissions.canEditPrices && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/orders/${order.id}/notes`}>
                <Edit className="size-3.5" />
                Edit
              </Link>
            </Button>
          )}
        </div>
        {order.notes ? (
          <p className="mt-2 whitespace-pre-wrap text-sm">{order.notes}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No notes.</p>
        )}
      </Surface>
    </div>
  );
}
