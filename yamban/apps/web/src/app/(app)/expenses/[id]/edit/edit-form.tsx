'use client';

import type { ExpenseCategory, PaymentMethod } from '@yamban/shared';
import { ExpenseForm } from '../../new/expense-form';

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

export function EditExpenseForm({ expense }: { expense: ExpenseDetail }) {
  return (
    <ExpenseForm
      mode="edit"
      defaultValues={{
        id: expense.id,
        expenseDate: expense.expenseDate,
        category: expense.category,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        description: expense.description,
        supplierId: expense.supplierId,
        orderId: expense.orderId,
      }}
    />
  );
}
