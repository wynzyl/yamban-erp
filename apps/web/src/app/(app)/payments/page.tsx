import { formatDate, formatMoney, PAYMENT_METHOD_LABELS, type Paginated, type PaymentMethod } from '@yamban/shared';
import { CreditCard, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { PaymentSearch } from './payment-search';

export const metadata: Metadata = { title: 'Payments' };

interface PaymentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  paymentDate: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const { search = '', page = '1' } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  const data = await apiFetch<Paginated<PaymentRow>>(`/payments?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(p));
    return `?${params}`;
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Payments" count={data.total}>
        <Button asChild>
          <Link href="/payments/new">
            <Plus className="size-4" />
            Record payment
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <PaymentSearch defaultValue={search} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="size-10" strokeWidth={1.5} />}
            message={search ? `No payments match "${search}".` : 'No payments yet.'}
            action={search ? 'Try a different search.' : 'Record the first one to get started.'}
          >
            {!search && (
              <Button asChild size="sm">
                <Link href="/payments/new">Record payment</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => {
                const fullName = [p.customerFirstName, p.customerLastName].filter(Boolean).join(' ');
                return (
                  <TableRow key={p.id} className="group">
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/payments/${p.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {formatDate(p.paymentDate)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/orders/${p.orderId}`}
                        className="text-primary hover:underline"
                      >
                        {p.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fullName}</TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                    <TableCell className="text-muted-foreground">{p.reference ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Money value={p.amount} />
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
