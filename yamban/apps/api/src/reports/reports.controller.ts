import { Controller, Get, Query } from '@nestjs/common';
import {
  expenseBreakdownQuerySchema,
  paginatedReportQuerySchema,
  reportDateRangeQuerySchema,
} from '@yamban/shared';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@Roles('OWNER')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('sales-summary')
  getSalesSummary(
    @Query(new ZodValidationPipe(reportDateRangeQuerySchema))
    query: ReturnType<typeof reportDateRangeQuerySchema.parse>,
  ) {
    return this.reports.getSalesSummary(query);
  }

  @Get('sales-by-customer')
  getSalesByCustomer(
    @Query(new ZodValidationPipe(paginatedReportQuerySchema))
    query: ReturnType<typeof paginatedReportQuerySchema.parse>,
  ) {
    return this.reports.getSalesByCustomer(query);
  }

  @Get('sales-by-product')
  getSalesByProduct(
    @Query(new ZodValidationPipe(reportDateRangeQuerySchema))
    query: ReturnType<typeof reportDateRangeQuerySchema.parse>,
  ) {
    return this.reports.getSalesByProduct(query);
  }

  @Get('outstanding-balances')
  getOutstandingBalances() {
    return this.reports.getOutstandingBalances();
  }

  @Get('income-expense')
  getIncomeExpense(
    @Query(new ZodValidationPipe(reportDateRangeQuerySchema))
    query: ReturnType<typeof reportDateRangeQuerySchema.parse>,
  ) {
    return this.reports.getIncomeExpense(query);
  }

  @Get('expense-breakdown')
  getExpenseBreakdown(
    @Query(new ZodValidationPipe(expenseBreakdownQuerySchema))
    query: ReturnType<typeof expenseBreakdownQuerySchema.parse>,
  ) {
    return this.reports.getExpenseBreakdown(query);
  }

  @Get('profit-margins')
  getProfitMargins(
    @Query(new ZodValidationPipe(paginatedReportQuerySchema))
    query: ReturnType<typeof paginatedReportQuerySchema.parse>,
  ) {
    return this.reports.getProfitMargins(query);
  }

  @Get('cash-flow')
  getCashFlow(
    @Query(new ZodValidationPipe(reportDateRangeQuerySchema))
    query: ReturnType<typeof reportDateRangeQuerySchema.parse>,
  ) {
    return this.reports.getCashFlow(query);
  }

  @Get('dashboard-summary')
  getDashboardSummary() {
    return this.reports.getDashboardSummary();
  }
}
