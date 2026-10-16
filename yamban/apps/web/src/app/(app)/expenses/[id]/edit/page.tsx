import type { ExpenseCategory, PaymentMethod } from '@yamban/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api';
import { EditExpenseForm } from './edit-form';

export const metadata: Metadata = { title: 'Edit expense' };

interface ExpenseDetail {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  supplierId: string | null;
  amount: string;
  paymentMethod: PaymentMethod;
  description: string;
  orderId: string | null;
}

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let expense: ExpenseDetail;
  try {
    expense = await apiFetch<ExpenseDetail>(`/expenses/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href={`/expenses/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to expense
        </Link>
      </div>

      <PageHeader title="Edit expense" />

      <div className="mt-6">
        <EditExpenseForm expense={expense} />
      </div>
    </div>
  );
}
