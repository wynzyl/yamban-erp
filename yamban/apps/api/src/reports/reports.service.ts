import { Injectable } from '@nestjs/common';
import type {
  CashFlowReport,
  ComparisonData,
  DashboardSummary,
  ExpenseBreakdownQuery,
  ExpenseBreakdownReport,
  IncomeExpenseReport,
  OutstandingBalanceRow,
  OutstandingBalancesReport,
  PaginatedReportQuery,
  ProfitMarginsReport,
  ProfitMarginsRow,
  ReportDateRangeQuery,
  SalesByCustomerReport,
  SalesByProductReport,
  SalesSummaryReport,
} from '@yamban/shared';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { InjectDb } from '../db/database.module.js';
import {
  customers,
  expenses,
  orderItems,
  orders,
  organizations,
  payments,
  products,
  suppliers,
} from '../db/schema/index.js';
import { SettingsService } from '../settings/settings.service.js';

/** Order statuses that count as "confirmed" for revenue calculations. */
const CONFIRMED_STATUSES = ['CONFIRMED', 'IN_PRODUCTION', 'READY', 'RELEASED'] as const;

@Injectable()
export class ReportsService {
  constructor(
    @InjectDb() private readonly db: Database,
    private readonly settingsService: SettingsService,
  ) {}

  /** Calculate comparison period dates based on primary range and comparison mode. */
  private getComparisonPeriod(
    startDate: string,
    endDate: string,
    compareWith: string,
  ): { startDate: string; endDate: string } | null {
    if (compareWith === 'none') return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (compareWith === 'previous_period') {
      const compEnd = new Date(start);
      compEnd.setDate(compEnd.getDate() - 1);
      const compStart = new Date(compEnd);
      compStart.setDate(compStart.getDate() - daysDiff);
      return {
        startDate: compStart.toISOString().split('T')[0]!,
        endDate: compEnd.toISOString().split('T')[0]!,
      };
    }

    if (compareWith === 'same_period_last_year') {
      const compStart = new Date(start);
      compStart.setFullYear(compStart.getFullYear() - 1);
      const compEnd = new Date(end);
      compEnd.setFullYear(compEnd.getFullYear() - 1);
      return {
        startDate: compStart.toISOString().split('T')[0]!,
        endDate: compEnd.toISOString().split('T')[0]!,
      };
    }

    return null;
  }

  /** Build comparison data object. */
  private buildComparison(
    current: number,
    previous: number | null,
  ): ComparisonData {
    const changePercent =
      previous !== null && previous !== 0
        ? Math.round(((current - previous) / previous) * 100 * 100) / 100
        : null;

    let changeDirection: 'up' | 'down' | 'flat' | null = null;
    if (changePercent !== null) {
      if (changePercent > 0) changeDirection = 'up';
      else if (changePercent < 0) changeDirection = 'down';
      else changeDirection = 'flat';
    }

    return {
      value: current.toFixed(2),
      previousValue: previous !== null ? previous.toFixed(2) : null,
      changePercent,
      changeDirection,
    };
  }

  /** Get total revenue for a date range (from confirmed+ orders). */
  private async getRevenue(startDate: string, endDate: string): Promise<number> {
    const [result] = await this.db
      .select({ total: sql<string>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(
        and(
          inArray(orders.status, CONFIRMED_STATUSES),
          gte(orders.orderDate, startDate),
          lt(orders.orderDate, endDate),
        ),
      );
    return parseFloat(result?.total ?? '0');
  }

  /** Get order count for a date range. */
  private async getOrderCount(startDate: string, endDate: string): Promise<number> {
    const count = await this.db.$count(
      this.db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            inArray(orders.status, CONFIRMED_STATUSES),
            gte(orders.orderDate, startDate),
            lt(orders.orderDate, endDate),
          ),
        )
        .as('cnt'),
    );
    return count;
  }

  /** Get total payments received for a date range. */
  private async getPaymentsReceived(startDate: string, endDate: string): Promise<number> {
    const [result] = await this.db
      .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(and(gte(payments.paymentDate, startDate), lt(payments.paymentDate, endDate)));
    return parseFloat(result?.total ?? '0');
  }

  /** Get total expenses for a date range. */
  private async getExpenses(startDate: string, endDate: string): Promise<number> {
    const [result] = await this.db
      .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, startDate), lt(expenses.expenseDate, endDate)));
    return parseFloat(result?.total ?? '0');
  }

  /** AC-1: Sales summary report with date range and optional comparison. */
  async getSalesSummary(q: ReportDateRangeQuery): Promise<SalesSummaryReport> {
    const endDatePlusOne = this.addDays(q.endDate, 1);
    const compPeriod = this.getComparisonPeriod(q.startDate, endDatePlusOne, q.compareWith);

    const [revenue, orderCount] = await Promise.all([
      this.getRevenue(q.startDate, endDatePlusOne),
      this.getOrderCount(q.startDate, endDatePlusOne),
    ]);
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    let prevRevenue: number | null = null;
    let prevOrderCount: number | null = null;
    let prevAvgOrderValue: number | null = null;

    if (compPeriod) {
      const compEndPlusOne = this.addDays(compPeriod.endDate, 1);
      const [pRev, pCnt] = await Promise.all([
        this.getRevenue(compPeriod.startDate, compEndPlusOne),
        this.getOrderCount(compPeriod.startDate, compEndPlusOne),
      ]);
      prevRevenue = pRev;
      prevOrderCount = pCnt;
      prevAvgOrderValue = pCnt > 0 ? pRev / pCnt : 0;
    }

    return {
      startDate: q.startDate,
      endDate: q.endDate,
      revenue: this.buildComparison(revenue, prevRevenue),
      orderCount: {
        value: String(orderCount),
        previousValue: prevOrderCount !== null ? String(prevOrderCount) : null,
        changePercent:
          prevOrderCount !== null && prevOrderCount !== 0
            ? Math.round(((orderCount - prevOrderCount) / prevOrderCount) * 100 * 100) / 100
            : null,
        changeDirection:
          prevOrderCount !== null
            ? orderCount > prevOrderCount
              ? 'up'
              : orderCount < prevOrderCount
                ? 'down'
                : 'flat'
            : null,
      },
      avgOrderValue: this.buildComparison(avgOrderValue, prevAvgOrderValue),
      comparisonPeriod: compPeriod,
    };
  }

  /** AC-2: Sales by customer with revenue, order count, and outstanding balance. */
  async getSalesByCustomer(q: PaginatedReportQuery): Promise<SalesByCustomerReport> {
    const endDatePlusOne = this.addDays(q.endDate, 1);

    const paymentsSubquery = this.db
      .select({
        orderId: payments.orderId,
        totalPaid: sql<string>`coalesce(sum(${payments.amount}), 0)`.as('total_paid'),
      })
      .from(payments)
      .groupBy(payments.orderId)
      .as('p');

    const rows = await this.db
      .select({
        customerId: customers.id,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`.as('customer_name'),
        organizationName: organizations.name,
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)`.as('revenue'),
        orderCount: sql<number>`count(${orders.id})::int`.as('order_count'),
        outstandingBalance: sql<string>`coalesce(sum(${orders.total} - coalesce(p.total_paid, 0)), 0)`.as(
          'outstanding',
        ),
      })
      .from(customers)
      .leftJoin(organizations, eq(organizations.id, customers.organizationId))
      .innerJoin(orders, eq(orders.customerId, customers.id))
      .leftJoin(paymentsSubquery, eq(paymentsSubquery.orderId, orders.id))
      .where(
        and(
          inArray(orders.status, CONFIRMED_STATUSES),
          gte(orders.orderDate, q.startDate),
          lt(orders.orderDate, endDatePlusOne),
        ),
      )
      .groupBy(customers.id, customers.firstName, customers.lastName, organizations.name)
      .orderBy(desc(sql`revenue`))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);

    const countResult = await this.db
      .selectDistinct({ customerId: orders.customerId })
      .from(orders)
      .where(
        and(
          inArray(orders.status, CONFIRMED_STATUSES),
          gte(orders.orderDate, q.startDate),
          lt(orders.orderDate, endDatePlusOne),
        ),
      );

    const totalRevenue = await this.getRevenue(q.startDate, endDatePlusOne);

    return {
      items: rows.map((r) => ({
        customerId: r.customerId,
        customerName: r.customerName,
        organizationName: r.organizationName,
        revenue: r.revenue,
        orderCount: r.orderCount,
        outstandingBalance: r.outstandingBalance,
      })),
      totalRevenue: totalRevenue.toFixed(2),
      page: q.page,
      pageSize: q.pageSize,
      total: countResult.length,
    };
  }

  /** AC-3: Sales by product with revenue and quantity sold. */
  async getSalesByProduct(q: ReportDateRangeQuery): Promise<SalesByProductReport> {
    const endDatePlusOne = this.addDays(q.endDate, 1);

    const rows = await this.db
      .select({
        productId: products.id,
        productName: products.name,
        revenue: sql<string>`coalesce(sum(${orderItems.subtotal}), 0)`.as('revenue'),
        quantitySold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`.as('qty'),
      })
      .from(products)
      .innerJoin(orderItems, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          inArray(orders.status, CONFIRMED_STATUSES),
          gte(orders.orderDate, q.startDate),
          lt(orders.orderDate, endDatePlusOne),
        ),
      )
      .groupBy(products.id, products.name)
      .orderBy(desc(sql`revenue`));

    const totalRevenue = rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0);

    return {
      items: rows.map((r) => ({
        productId: r.productId,
        productName: r.productName,
        revenue: r.revenue,
        quantitySold: r.quantitySold,
      })),
      totalRevenue: totalRevenue.toFixed(2),
    };
  }

  /** AC-4: Outstanding balances with aging buckets. */
  async getOutstandingBalances(): Promise<OutstandingBalancesReport> {
    const paymentsSubquery = this.db
      .select({
        orderId: payments.orderId,
        totalPaid: sql<string>`coalesce(sum(${payments.amount}), 0)`.as('total_paid'),
      })
      .from(payments)
      .groupBy(payments.orderId)
      .as('p');

    const rows = await this.db
      .select({
        customerId: customers.id,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        organizationName: organizations.name,
        orderId: orders.id,
        orderTotal: orders.total,
        totalPaid: paymentsSubquery.totalPaid,
        confirmedAt: orders.confirmedAt,
        orderDate: orders.orderDate,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .leftJoin(organizations, eq(organizations.id, customers.organizationId))
      .leftJoin(paymentsSubquery, eq(paymentsSubquery.orderId, orders.id))
      .where(inArray(orders.status, CONFIRMED_STATUSES));

    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        organizationName: string | null;
        totalOutstanding: number;
        orderCount: number;
        oldestOrderDate: string;
        buckets: { current: number; days1to30: number; days31to60: number; days61to90: number; over90: number };
      }
    >();

    const totals = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };
    const today = new Date();

    for (const row of rows) {
      const outstanding = parseFloat(row.orderTotal) - parseFloat(row.totalPaid ?? '0');
      if (outstanding <= 0) continue;

      const confirmedDate = row.confirmedAt ?? new Date(row.orderDate);
      const daysSince = Math.floor((today.getTime() - new Date(confirmedDate).getTime()) / (1000 * 60 * 60 * 24));

      let bucket: keyof typeof totals;
      if (daysSince <= 0) bucket = 'current';
      else if (daysSince <= 30) bucket = 'days1to30';
      else if (daysSince <= 60) bucket = 'days31to60';
      else if (daysSince <= 90) bucket = 'days61to90';
      else bucket = 'over90';

      totals[bucket] += outstanding;

      let entry = customerMap.get(row.customerId);
      if (!entry) {
        const customerName = `${row.customerFirstName} ${row.customerLastName}`.trim();
        entry = {
          customerId: row.customerId,
          customerName,
          organizationName: row.organizationName,
          totalOutstanding: 0,
          orderCount: 0,
          oldestOrderDate: row.orderDate,
          buckets: { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 },
        };
        customerMap.set(row.customerId, entry);
      }

      entry.totalOutstanding += outstanding;
      entry.orderCount += 1;
      entry.buckets[bucket] += outstanding;
      if (row.orderDate < entry.oldestOrderDate) {
        entry.oldestOrderDate = row.orderDate;
      }
    }

    const items: OutstandingBalanceRow[] = Array.from(customerMap.values())
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .map((e) => ({
        customerId: e.customerId,
        customerName: e.customerName,
        organizationName: e.organizationName,
        totalOutstanding: e.totalOutstanding.toFixed(2),
        orderCount: e.orderCount,
        oldestOrderDate: e.oldestOrderDate,
        buckets: {
          current: e.buckets.current.toFixed(2),
          days1to30: e.buckets.days1to30.toFixed(2),
          days31to60: e.buckets.days31to60.toFixed(2),
          days61to90: e.buckets.days61to90.toFixed(2),
          over90: e.buckets.over90.toFixed(2),
        },
      }));

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    return {
      items,
      totals: {
        current: totals.current.toFixed(2),
        days1to30: totals.days1to30.toFixed(2),
        days31to60: totals.days31to60.toFixed(2),
        days61to90: totals.days61to90.toFixed(2),
        over90: totals.over90.toFixed(2),
      },
      grandTotal: grandTotal.toFixed(2),
    };
  }

  /** AC-5: Income vs expense report with comparison. */
  async getIncomeExpense(q: ReportDateRangeQuery): Promise<IncomeExpenseReport> {
    const endDatePlusOne = this.addDays(q.endDate, 1);
    const compPeriod = this.getComparisonPeriod(q.startDate, endDatePlusOne, q.compareWith);

    const [income, expenseTotal] = await Promise.all([
      this.getPaymentsReceived(q.startDate, endDatePlusOne),
      this.getExpenses(q.startDate, endDatePlusOne),
    ]);
    const net = income - expenseTotal;

    let prevIncome: number | null = null;
    let prevExpenses: number | null = null;
    let prevNet: number | null = null;

    if (compPeriod) {
      const compEndPlusOne = this.addDays(compPeriod.endDate, 1);
      const [pInc, pExp] = await Promise.all([
        this.getPaymentsReceived(compPeriod.startDate, compEndPlusOne),
        this.getExpenses(compPeriod.startDate, compEndPlusOne),
      ]);
      prevIncome = pInc;
      prevExpenses = pExp;
      prevNet = pInc - pExp;
    }

    return {
      startDate: q.startDate,
      endDate: q.endDate,
      income: this.buildComparison(income, prevIncome),
      expenses: this.buildComparison(expenseTotal, prevExpenses),
      net: this.buildComparison(net, prevNet),
      comparisonPeriod: compPeriod,
    };
  }

  /** AC-6: Expense breakdown by category, supplier, or month. */
  async getExpenseBreakdown(q: ExpenseBreakdownQuery): Promise<ExpenseBreakdownReport> {
    const endDatePlusOne = this.addDays(q.endDate, 1);

    type SqlWithAlias = ReturnType<typeof sql<string>> & { as: (alias: string) => unknown };
    let groupKey: SqlWithAlias;
    let groupLabel: SqlWithAlias;

    if (q.groupBy === 'category') {
      groupKey = sql<string>`${expenses.category}` as SqlWithAlias;
      groupLabel = sql<string>`${expenses.category}` as SqlWithAlias;
    } else if (q.groupBy === 'supplier') {
      groupKey = sql<string>`coalesce(${expenses.supplierId}::text, 'none')` as SqlWithAlias;
      groupLabel = sql<string>`coalesce(
        (select ${suppliers.name} from ${suppliers} where ${suppliers.id} = ${expenses.supplierId}),
        'No supplier'
      )` as SqlWithAlias;
    } else {
      groupKey = sql<string>`to_char(${expenses.expenseDate}, 'YYYY-MM')` as SqlWithAlias;
      groupLabel = sql<string>`to_char(${expenses.expenseDate}, 'YYYY-MM')` as SqlWithAlias;
    }

    const rows = await this.db
      .select({
        groupKey: groupKey.as('group_key') as unknown as ReturnType<typeof sql<string>>,
        groupLabel: groupLabel.as('group_label') as unknown as ReturnType<typeof sql<string>>,
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`.as('total'),
        count: sql<number>`count(*)::int`.as('cnt'),
      })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, q.startDate), lt(expenses.expenseDate, endDatePlusOne)))
      .groupBy(groupKey, groupLabel)
      .orderBy(desc(sql`total`));

    const grandTotal = rows.reduce((sum, r) => sum + parseFloat(r.total), 0);

    return {
      groupBy: q.groupBy,
      items: rows.map((r) => ({
        groupKey: String(r.groupKey),
        groupLabel: String(r.groupLabel),
        total: r.total,
        count: r.count,
      })),
      grandTotal: grandTotal.toFixed(2),
    };
  }

  /** AC-7: Profit margins report with overhead allocation. */
  async getProfitMargins(q: PaginatedReportQuery): Promise<ProfitMarginsReport> {
    const endDatePlusOne = this.addDays(q.endDate, 1);

    const overhead = await this.settingsService.getOverhead();
    const monthlyOverhead = overhead ? parseFloat(overhead.monthlyAmount) : 0;
    const overheadConfigured = overhead !== null;

    const rows = await this.db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        customerName: sql<string>`${customers.firstName} || ' ' || ${customers.lastName}`.as('customer_name'),
        orderDate: orders.orderDate,
        revenue: orders.total,
        materialCost: sql<string>`coalesce(${orders.actualMaterialCost}, ${orders.estimatedMaterialCost}, '0')`.as(
          'material_cost',
        ),
        laborCost: sql<string>`coalesce(${orders.actualLaborCost}, ${orders.estimatedLaborCost}, '0')`.as(
          'labor_cost',
        ),
        confirmedAt: orders.confirmedAt,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(
        and(
          inArray(orders.status, CONFIRMED_STATUSES),
          gte(orders.orderDate, q.startDate),
          lt(orders.orderDate, endDatePlusOne),
        ),
      )
      .orderBy(desc(orders.orderDate))
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);

    const countResult = await this.db.$count(
      this.db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            inArray(orders.status, CONFIRMED_STATUSES),
            gte(orders.orderDate, q.startDate),
            lt(orders.orderDate, endDatePlusOne),
          ),
        )
        .as('cnt'),
    );

    const monthOrderCounts = new Map<string, number>();
    for (const row of rows) {
      const month = (row.confirmedAt ?? new Date(row.orderDate)).toISOString().slice(0, 7);
      monthOrderCounts.set(month, (monthOrderCounts.get(month) ?? 0) + 1);
    }

    const items: ProfitMarginsRow[] = rows.map((row) => {
      const month = (row.confirmedAt ?? new Date(row.orderDate)).toISOString().slice(0, 7);
      const ordersInMonth = monthOrderCounts.get(month) ?? 1;
      const overheadAllocation = overheadConfigured ? monthlyOverhead / ordersInMonth : 0;

      const revenue = parseFloat(row.revenue);
      const materialCost = parseFloat(row.materialCost);
      const laborCost = parseFloat(row.laborCost);
      const totalCost = materialCost + laborCost + overheadAllocation;
      const profit = revenue - totalCost;
      const marginPercent = revenue > 0 ? Math.round((profit / revenue) * 100 * 100) / 100 : 0;

      return {
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        customerName: row.customerName,
        orderDate: row.orderDate,
        revenue: revenue.toFixed(2),
        materialCost: materialCost.toFixed(2),
        laborCost: laborCost.toFixed(2),
        overheadAllocation: overheadAllocation.toFixed(2),
        totalCost: totalCost.toFixed(2),
        profit: profit.toFixed(2),
        marginPercent,
      };
    });

    const totals = items.reduce(
      (acc, i) => ({
        revenue: acc.revenue + parseFloat(i.revenue),
        cost: acc.cost + parseFloat(i.totalCost),
        profit: acc.profit + parseFloat(i.profit),
      }),
      { revenue: 0, cost: 0, profit: 0 },
    );

    return {
      items,
      summary: {
        totalRevenue: totals.revenue.toFixed(2),
        totalCost: totals.cost.toFixed(2),
        totalProfit: totals.profit.toFixed(2),
        avgMarginPercent: totals.revenue > 0 ? Math.round((totals.profit / totals.revenue) * 100 * 100) / 100 : 0,
      },
      overheadConfigured,
      overheadNote: overheadConfigured
        ? null
        : 'Overhead is not configured. Margins shown without overhead allocation.',
      page: q.page,
      pageSize: q.pageSize,
      total: countResult,
    };
  }

  /** AC-8: Cash flow report (payments in vs expenses out). */
  async getCashFlow(q: ReportDateRangeQuery): Promise<CashFlowReport> {
    const endDatePlusOne = this.addDays(q.endDate, 1);
    const compPeriod = this.getComparisonPeriod(q.startDate, endDatePlusOne, q.compareWith);

    const [paymentsIn, expensesOut] = await Promise.all([
      this.getPaymentsReceived(q.startDate, endDatePlusOne),
      this.getExpenses(q.startDate, endDatePlusOne),
    ]);
    const netFlow = paymentsIn - expensesOut;

    let prevPaymentsIn: number | null = null;
    let prevExpensesOut: number | null = null;
    let prevNetFlow: number | null = null;

    if (compPeriod) {
      const compEndPlusOne = this.addDays(compPeriod.endDate, 1);
      const [pPay, pExp] = await Promise.all([
        this.getPaymentsReceived(compPeriod.startDate, compEndPlusOne),
        this.getExpenses(compPeriod.startDate, compEndPlusOne),
      ]);
      prevPaymentsIn = pPay;
      prevExpensesOut = pExp;
      prevNetFlow = pPay - pExp;
    }

    return {
      startDate: q.startDate,
      endDate: q.endDate,
      paymentsIn: this.buildComparison(paymentsIn, prevPaymentsIn),
      expensesOut: this.buildComparison(expensesOut, prevExpensesOut),
      netFlow: this.buildComparison(netFlow, prevNetFlow),
      comparisonPeriod: compPeriod,
    };
  }

  /** AC-14: Dashboard summary with key metrics. */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]!;
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]!;

    const [revenueThisMonth, revenuePrevMonth, income, expenseTotal, outstandingData] = await Promise.all([
      this.getRevenue(thisMonthStart, nextMonthStart),
      this.getRevenue(lastMonthStart, thisMonthStart),
      this.getPaymentsReceived(thisMonthStart, nextMonthStart),
      this.getExpenses(thisMonthStart, nextMonthStart),
      this.getOutstandingBalances(),
    ]);

    const [incomePrev, expensePrev] = await Promise.all([
      this.getPaymentsReceived(lastMonthStart, thisMonthStart),
      this.getExpenses(lastMonthStart, thisMonthStart),
    ]);

    const netProfitThisMonth = income - expenseTotal;
    const netProfitPrevMonth = incomePrev - expensePrev;

    const revenueChange =
      revenuePrevMonth !== 0
        ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100 * 100) / 100
        : null;

    const netProfitChange =
      netProfitPrevMonth !== 0
        ? Math.round(((netProfitThisMonth - netProfitPrevMonth) / Math.abs(netProfitPrevMonth)) * 100 * 100) / 100
        : null;

    const overdueCount = outstandingData.items.filter(
      (i) => parseFloat(i.buckets.over90) > 0 || parseFloat(i.buckets.days61to90) > 0,
    ).length;

    return {
      revenueThisMonth: revenueThisMonth.toFixed(2),
      revenuePreviousMonth: revenuePrevMonth.toFixed(2),
      revenueChangePercent: revenueChange,
      outstandingTotal: outstandingData.grandTotal,
      overdueCount,
      netProfitThisMonth: netProfitThisMonth.toFixed(2),
      netProfitChangePercent: netProfitChange,
    };
  }

  /** Add days to a date string. */
  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0]!;
  }
}
