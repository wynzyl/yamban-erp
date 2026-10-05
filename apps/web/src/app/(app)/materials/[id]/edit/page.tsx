import type { Paginated, StockUnit } from '@yamban/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { MaterialForm } from '../../new/material-form';

export const metadata: Metadata = { title: 'Edit material' };

interface Material {
  id: string;
  name: string;
  color: string | null;
  category: string;
  unit: StockUnit;
  purchaseUnit: string;
  purchaseQuantity: string;
  defaultSupplierId: string | null;
  reorderLevel: string;
  averageUnitCost: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default async function EditMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [material, suppliersData] = await Promise.all([
    apiFetch<Material>(`/materials/${id}`).catch(() => null),
    apiFetch<Paginated<Supplier>>('/suppliers?pageSize=100').catch(() => ({
      items: [],
      page: 1,
      pageSize: 100,
      total: 0,
    })),
  ]);

  if (!material) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Edit material</h1>
      <MaterialForm initialData={material} suppliers={suppliersData.items} />
    </div>
  );
}
