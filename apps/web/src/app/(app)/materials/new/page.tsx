import type { Paginated } from '@yamban/shared';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { MaterialForm } from './material-form';

export const metadata: Metadata = { title: 'Add material' };

interface Supplier {
  id: string;
  name: string;
}

export default async function NewMaterialPage() {
  // Fetch all suppliers for the dropdown
  const suppliersData = await apiFetch<Paginated<Supplier>>('/suppliers?pageSize=100').catch(() => ({
    items: [],
    page: 1,
    pageSize: 100,
    total: 0,
  }));

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Add material</h1>
      <MaterialForm suppliers={suppliersData.items} />
    </div>
  );
}
