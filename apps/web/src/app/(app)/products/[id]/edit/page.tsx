import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { ProductForm } from '../../new/product-form';

export const metadata: Metadata = { title: 'Edit product' };

interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: string;
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let product: ProductDetail;
  try {
    product = await apiFetch<ProductDetail>(`/products/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href={`/products/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to product
        </Link>
      </div>

      <PageHeader title="Edit product" />

      <div className="mt-6">
        <ProductForm initialData={product} />
      </div>
    </div>
  );
}
