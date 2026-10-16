import type { Metadata } from 'next';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { CategoriesList } from './categories-list';

export const metadata: Metadata = { title: 'Categories' };

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export default async function CategoriesPage() {
  const categories = await apiFetch<Category[]>('/categories');

  return (
    <div className="max-w-2xl">
      <PageHeader title="Material categories" />
      <CategoriesList categories={categories} />
    </div>
  );
}
