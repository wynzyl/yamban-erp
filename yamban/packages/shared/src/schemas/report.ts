import { z } from 'zod';

/** Comparison mode for reports. */
export const COMPARISON_MODES = ['previous_period', 'same_period_last_year', 'none'] as const;
export type ComparisonMode = (typeof COMPARISON_MODES)[number];

/** Grouping options for expense breakdown report. */
export const EXPENSE_GROUPBY_OPTIONS = ['category', 'supplier', 'month'] as const;
export type ExpenseGroupBy = (typeof EXPENSE_GROUPBY_OPTIONS)[number];

/** Base date range schema used by most reports. */
const dateRangeBase = z.object({
  startDate: z.string().date('Enter a valid start date.'),
  endDate: z.string().date('Enter a valid end date.'),
});

/** Query schema for reports with date range and optional comparison. */
export const reportDateRangeQuerySchema = dateRangeBase.extend({
  compareWith: z.enum(COMPARISON_MODES).optional().default('none'),
});
export type ReportDateRangeQuery = z.output<typeof reportDateRangeQuerySchema>;

/** Query schema for paginated reports with date range. */
export const paginatedReportQuerySchema = dateRangeBase.extend({
  compareWith: z.enum(COMPARISON_MODES).optional().default('none'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});
export type PaginatedReportQuery = z.output<typeof paginatedReportQuerySchema>;

/** Query schema for expense breakdown report. */
export const expenseBreakdownQuerySchema = dateRangeBase.extend({
  groupBy: z.enum(EXPENSE_GROUPBY_OPTIONS).optional().default('category'),
});
export type ExpenseBreakdownQuery = z.output<typeof expenseBreakdownQuerySchema>;

/** Response types for reports. */

export interface ComparisonData {
  value: string;
  previousValue: string | null;
  changePercent: number | null;
  changeDirection: 'up' | 'down' | 'flat' | null;
}

export interface SalesSummaryReport {
  startDate: string;
  endDate: string;
  revenue: ComparisonData;
  orderCount: ComparisonData;
  avgOrderValue: ComparisonData;
  comparisonPeriod: { startDate: string; endDate: string } | null;
}

export interface SalesByCustomerRow {
  customerId: string;
  customerName: string;
  organizationName: string | null;
  revenue: string;
  orderCount: number;
  outstandingBalance: string;
}

export interface SalesByCustomerReport {
  items: SalesByCustomerRow[];
  totalRevenue: string;
  page: number;
  pageSize: number;
  total: number;
}

export interface SalesByProductRow {
  productId: string;
  productName: string;
  revenue: string;
  quantitySold: number;
}

export interface SalesByProductReport {
  items: SalesByProductRow[];
  totalRevenue: string;
}

export interface AgingBuckets {
  current: string;
  days1to30: string;
  days31to60: string;
  days61to90: string;
  over90: string;
}

export interface OutstandingBalanceRow {
  customerId: string;
  customerName: string;
  organizationName: string | null;
  totalOutstanding: string;
  orderCount: number;
  oldestOrderDate: string;
  buckets: AgingBuckets;
}

export interface OutstandingBalancesReport {
  items: OutstandingBalanceRow[];
  totals: AgingBuckets;
  grandTotal: string;
}

export interface IncomeExpenseReport {
  startDate: string;
  endDate: string;
  income: ComparisonData;
  expenses: ComparisonData;
  net: ComparisonData;
  comparisonPeriod: { startDate: string; endDate: string } | null;
}

export interface ExpenseGroupRow {
  groupKey: string;
  groupLabel: string;
  total: string;
  count: number;
}

export interface ExpenseBreakdownReport {
  groupBy: ExpenseGroupBy;
  items: ExpenseGroupRow[];
  grandTotal: string;
}

export interface ProfitMarginsRow {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderDate: string;
  revenue: string;
  materialCost: string;
  laborCost: string;
  overheadAllocation: string;
  totalCost: string;
  profit: string;
  marginPercent: number;
}

export interface ProfitMarginsReport {
  items: ProfitMarginsRow[];
  summary: {
    totalRevenue: string;
    totalCost: string;
    totalProfit: string;
    avgMarginPercent: number;
  };
  overheadConfigured: boolean;
  overheadNote: string | null;
  page: number;
  pageSize: number;
  total: number;
}

export interface CashFlowReport {
  startDate: string;
  endDate: string;
  paymentsIn: ComparisonData;
  expensesOut: ComparisonData;
  netFlow: ComparisonData;
  comparisonPeriod: { startDate: string; endDate: string } | null;
}

export interface DashboardSummary {
  revenueThisMonth: string;
  revenuePreviousMonth: string;
  revenueChangePercent: number | null;
  outstandingTotal: string;
  overdueCount: number;
  netProfitThisMonth: string;
  netProfitChangePercent: number | null;
}
