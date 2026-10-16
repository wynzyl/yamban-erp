import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateExpenseData,
  ExpenseCategory,
  ListExpenseQuery,
  Paginated,
  UpdateExpenseData,
} from '@yamban/shared';
import { and, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import { expenses, orders, suppliers, users } from '../db/schema/index.js';

export interface ExpenseListRow {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  supplierName: string | null;
  amount: string;
  paymentMethod: string;
  description: string;
  orderNumber: string | null;
  createdAt: Date;
}

export interface ExpenseSummary {
  total: string;
  byCategory: Record<ExpenseCategory, string>;
}

export interface ExpenseListResponse {
  items: ExpenseListRow[];
  summary: ExpenseSummary;
  page: number;
  pageSize: number;
  total: number;
}

export interface ExpenseDetailRow {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  supplierId: string | null;
  supplierName: string | null;
  amount: string;
  paymentMethod: string;
  description: string;
  orderId: string | null;
  orderNumber: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

@Injectable()
export class ExpensesService {
  constructor(@InjectDb() private readonly db: Database) {}

  async list(q: ListExpenseQuery): Promise<ExpenseListResponse> {
    const conditions: SQL[] = [];

    // Month filter: default to current month
    const month = q.month ?? this.getCurrentMonth();
    const startDate = `${month}-01`;
    const nextMonth = this.getNextMonth(month);
    const endDate = `${nextMonth}-01`;
    conditions.push(gte(expenses.expenseDate, startDate));
    conditions.push(lt(expenses.expenseDate, endDate));

    // Category filter
    if (q.categories?.length) {
      conditions.push(inArray(expenses.category, q.categories));
    }

    // Search filter
    if (q.search) {
      const term = `%${q.search.replace(/[%_\\]/g, '\\$&')}%`;
      conditions.push(
        or(
          ilike(expenses.description, term),
          ilike(suppliers.name, term),
          ilike(orders.orderNumber, term),
        )!,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    // Get items with pagination
    const [rows, countResult, summaryRows] = await Promise.all([
      this.db
        .select({
          id: expenses.id,
          expenseDate: expenses.expenseDate,
          category: expenses.category,
          supplierName: suppliers.name,
          amount: expenses.amount,
          paymentMethod: expenses.paymentMethod,
          description: expenses.description,
          orderNumber: orders.orderNumber,
          createdAt: expenses.createdAt,
        })
        .from(expenses)
        .leftJoin(suppliers, eq(suppliers.id, expenses.supplierId))
        .leftJoin(orders, eq(orders.id, expenses.orderId))
        .where(where)
        .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
        .limit(q.pageSize)
        .offset((q.page - 1) * q.pageSize),
      this.db.$count(
        this.db
          .select({ id: expenses.id })
          .from(expenses)
          .leftJoin(suppliers, eq(suppliers.id, expenses.supplierId))
          .leftJoin(orders, eq(orders.id, expenses.orderId))
          .where(where)
          .as('e'),
      ),
      // Summary query: total and by category for the month (ignoring pagination and category filter)
      this.db
        .select({
          category: expenses.category,
          total: sql<string>`coalesce(sum(${expenses.amount}), 0)`.as('total'),
        })
        .from(expenses)
        .where(and(gte(expenses.expenseDate, startDate), lt(expenses.expenseDate, endDate)))
        .groupBy(expenses.category),
    ]);

    // Build summary
    const byCategory = {} as Record<ExpenseCategory, string>;
    const allCategories: ExpenseCategory[] = [
      'SALARY',
      'GOVT_CONTRIBUTIONS',
      'RENT',
      'UTILITIES',
      'FUEL',
      'VEHICLE_MAINTENANCE',
      'REPAIR_MAINTENANCE',
      'PROFESSIONAL_FEES',
      'MEALS_SNACKS',
      'OFFICE_SUPPLIES',
      'SHIPPING',
      'LOAN_PAYMENT',
      'OTHER',
    ];
    for (const cat of allCategories) {
      byCategory[cat] = '0.00';
    }
    let grandTotal = 0;
    for (const row of summaryRows) {
      byCategory[row.category] = row.total;
      grandTotal += parseFloat(row.total);
    }

    return {
      items: rows,
      summary: {
        total: grandTotal.toFixed(2),
        byCategory,
      },
      page: q.page,
      pageSize: q.pageSize,
      total: countResult,
    };
  }

  async get(id: string): Promise<ExpenseDetailRow> {
    const [row] = await this.db
      .select({
        id: expenses.id,
        expenseDate: expenses.expenseDate,
        category: expenses.category,
        supplierId: expenses.supplierId,
        supplierName: suppliers.name,
        amount: expenses.amount,
        paymentMethod: expenses.paymentMethod,
        description: expenses.description,
        orderId: expenses.orderId,
        orderNumber: orders.orderNumber,
        createdById: expenses.createdById,
        createdByName: users.name,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(suppliers, eq(suppliers.id, expenses.supplierId))
      .leftJoin(orders, eq(orders.id, expenses.orderId))
      .leftJoin(users, eq(users.id, expenses.createdById))
      .where(eq(expenses.id, id))
      .limit(1);

    if (!row) throw new NotFoundException('Expense not found.');
    return row;
  }

  async create(data: CreateExpenseData, userId: string) {
    const [row] = await this.db
      .insert(expenses)
      .values({
        expenseDate: data.expenseDate,
        category: data.category,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        description: data.description,
        supplierId: data.supplierId ?? null,
        orderId: data.orderId ?? null,
        createdById: userId,
      })
      .returning();

    return row!;
  }

  async update(
    id: string,
    data: UpdateExpenseData,
    userId: string,
    userRole: string,
  ) {
    // Check edit permission
    const existing = await this.get(id);
    this.checkEditPermission(existing, userId, userRole);

    const updates: Partial<typeof expenses.$inferInsert> = {};
    if (data.expenseDate !== undefined) updates.expenseDate = data.expenseDate;
    if (data.category !== undefined) updates.category = data.category;
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.paymentMethod !== undefined) updates.paymentMethod = data.paymentMethod;
    if (data.description !== undefined) updates.description = data.description;
    if (data.supplierId !== undefined) updates.supplierId = data.supplierId ?? null;
    if (data.orderId !== undefined) updates.orderId = data.orderId ?? null;

    const [row] = await this.db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    if (!row) throw new NotFoundException('Expense not found.');
    return row;
  }

  async delete(id: string): Promise<void> {
    const [row] = await this.db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning({ id: expenses.id });
    if (!row) throw new NotFoundException('Expense not found.');
  }

  private checkEditPermission(
    expense: ExpenseDetailRow,
    userId: string,
    userRole: string,
  ): void {
    // Owner can edit anytime
    if (userRole === 'OWNER') return;

    // Creator can edit same day only
    if (expense.createdById !== userId) {
      throw new ForbiddenException('You can only edit your own expenses.');
    }

    const today = this.getToday();
    const createdDate = expense.createdAt.toISOString().split('T')[0];
    if (createdDate !== today) {
      throw new ForbiddenException('You can only edit expenses on the same day they were created.');
    }
  }

  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getNextMonth(month: string): string {
    const parts = month.split('-').map(Number);
    const year = parts[0]!;
    const mon = parts[1]!;
    if (mon === 12) {
      return `${year + 1}-01`;
    }
    return `${year}-${String(mon + 1).padStart(2, '0')}`;
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0]!;
  }
}
