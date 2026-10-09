import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type PaymentMethod,
} from '@yamban/shared';
import { Receipt, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Money } from '@/components/domain/money';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api';
import { ExpenseFilters } from './expense-filters';
import { ExpensesTable } from './expenses-table';

export const metadata: Metadata = { title: 'Expenses' };

interface ExpenseRow {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  supplierName: string | null;
  amount: string;
  paymentMethod: PaymentMethod;
  description: string;
  orderNumber: string | null;
  createdAt: string;
}

interface ExpenseSummary {
  total: string;
  byCategory: Record<ExpenseCategory, string>;
}

interface ExpenseListResponse {
  items: ExpenseRow[];
  summary: ExpenseSummary;
  page: number;
  pageSize: number;
  total: number;
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    categories?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const month = params.month ?? getCurrentMonth();
  const categories = params.categories ?? '';
  const search = params.search ?? '';
  const page = params.page ?? '1';

  const qs = new URLSearchParams({ month, page });
  if (categories) qs.set('categories', categories);
  if (search) qs.set('search', search);

  const data = await apiFetch<ExpenseListResponse>(`/expenses?${qs}`);
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  function getPageUrl(p: number) {
    const params = new URLSearchParams({ month, page: String(p) });
    if (categories) params.set('categories', categories);
    if (search) params.set('search', search);
    return `?${params}`;
  }

  // Get categories with non-zero amounts for the summary
  const categoriesWithExpenses = EXPENSE_CATEGORIES.filter(
    (cat) => parseFloat(data.summary.byCategory[cat]) > 0,
  );

  return (
    <div className="max-w-5xl">
      <PageHeader title="Expenses" count={data.total}>
        <Button asChild>
          <Link href="/expenses/new">
            <Plus className="size-4" />
            Record expense
          </Link>
        </Button>
      </PageHeader>

      <div className="mt-6">
        <ExpenseFilters
          defaultMonth={month}
          defaultCategories={categories}
          defaultSearch={search}
        />
      </div>

      {/* Summary Panel */}
      <Surface className="mt-4 p-4">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{formatMonthLabel(month)} total</p>
            <p className="font-display text-2xl font-semibold">
              <Money value={data.summary.total} />
            </p>
          </div>
        </div>
        {categoriesWithExpenses.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {categoriesWithExpenses.map((cat) => (
              <div key={cat} className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm text-muted-foreground">
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </span>
                <span className="shrink-0 text-sm">
                  <Money value={data.summary.byCategory[cat]} />
                </span>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Surface className="mt-4 overflow-hidden">
        {data.items.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-10" strokeWidth={1.5} />}
            message={
              search || categories
                ? 'No expenses match your filters.'
                : `No expenses in ${formatMonthLabel(month)}.`
            }
            action={
              search || categories
                ? 'Try different filters.'
                : 'Record the first one to get started.'
            }
          >
            {!search && !categories && (
              <Button asChild size="sm">
                <Link href="/expenses/new">Record expense</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <ExpensesTable data={data.items} />
        )}
      </Surface>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.total > 0 && (
            <>
              Showing {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} of {data.total.toLocaleString()}
            </>
          )}
        </p>
        <Pagination currentPage={data.page} totalPages={totalPages} getPageUrl={getPageUrl} />
      </div>
    </div>
  );
}
