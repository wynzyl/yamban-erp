import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { ProductForm } from './product-form';

export const metadata: Metadata = { title: 'Add product' };

export default function NewProductPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to products
        </Link>
      </div>

      <PageHeader title="Add product" />

      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
