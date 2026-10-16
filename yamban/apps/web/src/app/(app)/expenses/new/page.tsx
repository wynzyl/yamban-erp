import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ExpenseForm } from './expense-form';

export const metadata: Metadata = { title: 'Record expense' };

export default function NewExpensePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Record expense">
        <Button variant="outline" asChild>
          <Link href="/expenses">Cancel</Link>
        </Button>
      </PageHeader>
      <div className="mt-6">
        <ExpenseForm />
      </div>
    </div>
  );
}
