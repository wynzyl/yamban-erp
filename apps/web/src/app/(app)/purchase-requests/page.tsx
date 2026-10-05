import { formatMoney, type Paginated, PURCHASE_REQUEST_STATUS_LABELS, type PurchaseRequestStatus } from '@yamban/shared';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { BuildFromShortagesButton } from './build-from-shortages-button';
import { PurchaseRequestSearch } from './purchase-request-search';

export const metadata: Metadata = { title: 'Purchase requests' };

interface PurchaseRequestListRow {
  id: string;
  prNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  status: PurchaseRequestStatus;
  neededBy: string | null;
  lineCount: number;
  estimatedTotal: string;
  createdAt: string;
}

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; status?: string }>;
}) {
  const { search = '', page = '1', status } = await searchParams;
  const qs = new URLSearchParams({ page });
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);

  const data = await apiFetch<Paginated<PurchaseRequestListRow>>(`/purchase-requests?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(p));
    return `?${params}`;
  }

  function getStatusVariant(s: PurchaseRequestStatus) {
    switch (s) {
      case 'DRAFT':
        return 'outline';
      case 'PRINTED':
        return 'secondary';
      case 'ORDERED':
        return 'default';
      case 'RECEIVED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title="Purchase requests" count={data.total}>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/purchase-requests/shortages">View shortages</Link>
          </Button>
          <BuildFromShortagesButton />
        </div>
      </PageHeader>

      <div className="mt-6">
        <PurchaseRequestSearch defaultValue={search} />
      </div>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-10" strokeWidth={1.5} />}
            message={search ? `No purchase requests match "${search}".` : 'No purchase requests yet.'}
            action={search ? 'Try a different search.' : 'Build from shortages to get started.'}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PR Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Est. total</TableHead>
                <TableHead>Needed by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell>
                    <Link
                      href={`/purchase-requests/${pr.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {pr.prNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{pr.supplierName ?? 'No supplier'}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(pr.status)}>
                      {PURCHASE_REQUEST_STATUS_LABELS[pr.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pr.lineCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(pr.estimatedTotal)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {pr.neededBy ? new Date(pr.neededBy).toLocaleDateString('en-PH') : '—'}
                  </TableCell>
                </TableRow>
              ))}
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
