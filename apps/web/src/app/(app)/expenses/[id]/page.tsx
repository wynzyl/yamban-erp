import {
  EXPENSE_CATEGORY_LABELS,
  formatDate,
  PAYMENT_METHOD_LABELS,
  type ExpenseCategory,
  type PaymentMethod,
} from '@yamban/shared';
import { ArrowLeft, Edit } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Surface } from '@/components/ui/surface';
import { apiFetch, getCurrentUser } from '@/lib/api';
import { DeleteExpenseButton } from './delete-button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const expense = await apiFetch<{ description: string; expenseDate: string }>(
      `/expenses/${id}`,
    );
    return { title: `Expense – ${formatDate(expense.expenseDate)}` };
  } catch {
    return { title: 'Expense not found' };
  }
}

interface ExpenseDetail {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  supplierId: string | null;
  supplierName: string | null;
  amount: string;
  paymentMethod: PaymentMethod;
  description: string;
  orderId: string | null;
  orderNumber: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export default async function ExpenseDetailPage({
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

  const user = await getCurrentUser();
  const isOwner = user?.role === 'OWNER';

  // Check if user can edit: owner can always edit, creator can edit same day
  const createdDate = expense.createdAt.split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const isCreator = expense.createdById === user?.id;
  const canEdit = isOwner || (isCreator && createdDate === today);

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to expenses
        </Link>
      </div>

      <PageHeader title="Expense details">
        <div className="flex items-center gap-2">
          {isOwner && <DeleteExpenseButton id={expense.id} />}
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/expenses/${expense.id}/edit`}>
                <Edit className="size-4" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      <Surface className="mt-6 p-6">
        <div className="mb-6 flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <Money value={expense.amount} className="text-2xl font-semibold" />
        </div>

        <dl className="space-y-4 text-sm">
          <div className="flex justify-between border-t border-border pt-4">
            <dt className="text-muted-foreground">Date</dt>
            <dd>{formatDate(expense.expenseDate)}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Category</dt>
            <dd>{EXPENSE_CATEGORY_LABELS[expense.category]}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Payment method</dt>
            <dd>{PAYMENT_METHOD_LABELS[expense.paymentMethod]}</dd>
          </div>

          {expense.supplierName && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Supplier</dt>
              <dd>{expense.supplierName}</dd>
            </div>
          )}

          {expense.orderNumber && expense.orderId && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Linked order</dt>
              <dd>
                <Link
                  href={`/orders/${expense.orderId}`}
                  className="text-primary hover:underline"
                >
                  {expense.orderNumber}
                </Link>
              </dd>
            </div>
          )}

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Recorded by</dt>
            <dd>{expense.createdByName ?? 'Unknown'}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Recorded</dt>
            <dd>{formatDate(expense.createdAt)}</dd>
          </div>

          {expense.updatedAt && expense.updatedAt !== expense.createdAt && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd>{formatDate(expense.updatedAt)}</dd>
            </div>
          )}
        </dl>
      </Surface>

      <Surface className="mt-4 p-4">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Description</h2>
        <p className="whitespace-pre-wrap text-sm">{expense.description}</p>
      </Surface>
    </div>
  );
}
