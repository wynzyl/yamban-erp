import type { Paginated } from '@yamban/shared';
import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { MaterialForm } from './material-form';

export const metadata: Metadata = { title: 'Add material' };

interface Supplier {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export default async function NewMaterialPage() {
  // Fetch suppliers and categories for the dropdowns
  const [suppliersData, categories] = await Promise.all([
    apiFetch<Paginated<Supplier>>('/suppliers?pageSize=100').catch(() => ({
      items: [],
      page: 1,
      pageSize: 100,
      total: 0,
    })),
    apiFetch<Category[]>('/categories').catch(() => []),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-[32px] font-semibold leading-tight">Add material</h1>
      <MaterialForm suppliers={suppliersData.items} categories={categories} />
    </div>
  );
}
