import {
  formatDate,
  type ProductionStage,
  PRODUCTION_STAGE_LABELS,
} from '@yamban/shared';
import { ArrowLeft, Edit } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
import { AddProcessForm } from './add-process-form';
import { DeleteProcessButton } from './delete-process-button';
import { DeleteProductButton } from './delete-button';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await apiFetch<{ name: string }>(`/products/${id}`);
    return { title: product.name };
  } catch {
    return { title: 'Product not found' };
  }
}

interface ProductProcess {
  id: string;
  machineId: string;
  machineName: string;
  machineStage: ProductionStage;
  powerKw: string;
  minutesPerPiece: string;
}

interface Machine {
  id: string;
  name: string;
  stage: ProductionStage;
  powerKw: string;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  processes: ProductProcess[];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product: ProductDetail;
  let machines: Machine[];
  try {
    [product, machines] = await Promise.all([
      apiFetch<ProductDetail>(`/products/${id}`),
      apiFetch<Machine[]>('/machines'),
    ]);
  } catch {
    notFound();
  }

  // Get machines that aren't already configured for this product
  const configuredMachineIds = new Set(product.processes.map((p) => p.machineId));
  const availableMachines = machines.filter((m) => !configuredMachineIds.has(m.id));

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
      </div>

      <PageHeader title={product.name}>
        <div className="flex items-center gap-2">
          <DeleteProductButton id={product.id} name={product.name} />
          <Button asChild variant="outline">
            <Link href={`/products/${product.id}/edit`}>
              <Edit className="size-4" />
              Edit
            </Link>
          </Button>
        </div>
      </PageHeader>

      <Surface className="mt-6 p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Product details</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="mt-1 font-medium">{product.name}</dd>
          </div>
          {product.description && (
            <div>
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-1">{product.description}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Default price</dt>
            <dd className="font-medium">
              <Money value={product.defaultPrice} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span
                className={`inline-flex h-6 items-center rounded-control px-2 text-xs font-medium ${
                  product.active
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {product.active ? 'Active' : 'Inactive'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDate(product.createdAt)}</dd>
          </div>
        </dl>
      </Surface>

      {/* Machine Processes */}
      <Surface className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium">Machine processes</h2>
          <AddProcessForm
            productId={product.id}
            machines={availableMachines}
          />
        </div>
        {product.processes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No machine processes configured. Add processes to track production costs.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">{process.machineName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PRODUCTION_STAGE_LABELS[process.machineStage]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {parseFloat(process.minutesPerPiece).toFixed(2)} min
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteProcessButton productId={product.id} processId={process.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Surface>
    </div>
  );
}
