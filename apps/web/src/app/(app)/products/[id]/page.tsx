import { formatDate, formatMoney, SIZE_LABELS, type GarmentSize } from '@yamban/shared';
import { ArrowLeft, Edit, Package } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/api';
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

interface ProductSize {
  id: string;
  size: GarmentSize;
  defaultPrice: string;
}

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  sizes: ProductSize[];
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product: ProductDetail;
  try {
    product = await apiFetch<ProductDetail>(`/products/${id}`);
  } catch {
    notFound();
  }

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

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Product Info */}
        <Surface className="p-4">
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

        {/* Quick Stats */}
        <Surface className="p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Summary</h2>
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <Package className="size-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{product.sizes.length}</p>
              <p className="text-sm text-muted-foreground">
                {product.sizes.length === 1 ? 'size' : 'sizes'} configured
              </p>
            </div>
          </div>
        </Surface>
      </div>

      {/* Sizes & Pricing */}
      <Surface className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium">Sizes & pricing</h2>
        </div>
        {product.sizes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No sizes configured yet. Edit this product to add sizes.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Default price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.sizes.map((size) => (
                <TableRow key={size.id}>
                  <TableCell className="font-medium">{SIZE_LABELS[size.size]}</TableCell>
                  <TableCell className="text-right">
                    <Money value={size.defaultPrice} />
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
