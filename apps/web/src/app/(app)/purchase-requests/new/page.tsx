import { type Paginated, type StockUnit } from '@yamban/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { PurchaseRequestForm } from './purchase-request-form';

export const metadata: Metadata = { title: 'New purchase request' };

interface SupplierOption {
  id: string;
  name: string;
}

interface MaterialOption {
  id: string;
  name: string;
  color: string | null;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  averageUnitCost: string;
  defaultSupplierId: string | null;
}

export default async function NewPurchaseRequestPage() {
  const [suppliersData, materialsData] = await Promise.all([
    apiFetch<Paginated<SupplierOption>>('/suppliers?limit=100'),
    apiFetch<Paginated<MaterialOption>>('/materials?limit=500'),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchase-requests">
            <ArrowLeft className="size-4" />
            Back to purchase requests
          </Link>
        </Button>
      </div>

      <PageHeader title="New purchase request" />

      <div className="mt-6">
        <PurchaseRequestForm
          suppliers={suppliersData.items}
          materials={materialsData.items}
        />
      </div>
    </div>
  );
}
