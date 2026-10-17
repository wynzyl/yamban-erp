# 0002. Sales and financial reports

**Date**: 2026-10-17
**Status**: In Progress

## Summary

The system gets a reports section where the owner can view sales performance and financial health. Eight reports cover revenue, customer balances, product performance, expenses, profit margins, and cash flow. Each report supports date filtering, period comparisons, and export to PDF or Excel. The dashboard also shows key metrics at a glance. All reports require the OWNER role.

## Requirements

**User stories**:
- As the shop owner, I want to see sales and revenue summaries so I can track business performance.
- As the shop owner, I want to know which customers owe money and for how long so I can follow up on collections.
- As the shop owner, I want to see profit margins per order so I can understand which jobs are profitable.
- As the shop owner, I want to compare this month to last month so I can spot trends.

**Acceptance criteria** (the contract):
- **AC-1**: Sales summary report shows total revenue, order count, and average order value for a selected date range.
- **AC-2**: Sales by customer report shows revenue, order count, and outstanding balance per customer.
- **AC-3**: Sales by product report shows revenue and quantity sold per product.
- **AC-4**: Outstanding balances report shows customers with unpaid amounts in aging buckets (Current, 1 to 30 days, 31 to 60, 61 to 90, Over 90).
- **AC-5**: Income vs expense report shows total income (payments received), total expenses, and net for a period.
- **AC-6**: Expense breakdown report groups expenses by category, supplier, or month.
- **AC-7**: Profit margins report shows revenue, material cost, labor cost, overhead allocation, and margin percentage per order.
- **AC-8**: Cash flow report shows payments received vs expenses paid for a period.
- **AC-9**: All reports support preset date ranges (This Month, Last 30 Days, etc.), custom start/end dates, and comparison to previous period or same period last year.
- **AC-10**: All reports can be exported to print view, PDF, and Excel/CSV.
- **AC-11**: Reports are accessible from a Reports hub page and from sidebar links.
- **AC-12**: Reports include charts: line charts for trends, bar charts for comparisons, pie charts for breakdowns.
- **AC-13**: Clicking a row in a report navigates to the source record (customer, order, etc.).
- **AC-14**: Dashboard shows summary widgets: revenue this month, outstanding balance total, net profit.
- **AC-15**: Only users with OWNER role can access reports and the overhead setting.
- **AC-16**: When no data exists for a period, reports show zeros with an empty state message.
- **AC-17**: When comparison period has no data, comparison columns show N/A.
- **AC-18**: When overhead is not configured, profit margins show without overhead and note it is not set.
- **AC-19**: Detailed reports (by customer, by order) paginate; summary reports show full aggregated totals.

## Decision

**Chosen option**: Real time report queries with client side charting and export

Reports are computed live from existing data (orders, payments, expenses). Recharts handles visualizations. React PDF generates PDFs. SheetJS (already installed) handles Excel/CSV export. One new table stores the monthly overhead setting.

**Implementation skills**: `yamban-design-system` (`anthropics/superpowers`, `.claude/skills/yamban-design-system/`)

## Rationale

Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch**:

| Table | Fields | Notes |
|-------|--------|-------|
| `overhead_settings` (new) | `id` (uuid PK), `monthlyAmount` (money NOT NULL), `updatedAt` (timestamp) | Single row table for current monthly overhead |

Existing tables used (no changes):
- `orders`: revenue (`total`), costs (`actualMaterialCost`, `actualLaborCost`, `estimatedMaterialCost`, `estimatedLaborCost`), dates (`orderDate`, `confirmedAt`)
- `payments`: money in (`amount`, `paymentDate`), linked to orders
- `expenses`: money out (`amount`, `expenseDate`, `category`)
- `customers`: customer breakdown
- `products`: product breakdown

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|----------|--------|------------|-------------|------|------------|
| `/api/reports/sales-summary` | GET | startDate, endDate, compareWith?, format? | revenue, orderCount, avgOrderValue, comparison | OWNER | 403 forbidden |
| `/api/reports/sales-by-customer` | GET | startDate, endDate, page?, format? | customers[], totalRevenue, pagination | OWNER | 403 |
| `/api/reports/sales-by-product` | GET | startDate, endDate, format? | products[], totalRevenue | OWNER | 403 |
| `/api/reports/outstanding-balances` | GET | format? | customers[], agingBuckets, totalOutstanding | OWNER | 403 |
| `/api/reports/income-expense` | GET | startDate, endDate, compareWith?, format? | income, expenses, net, comparison | OWNER | 403 |
| `/api/reports/expense-breakdown` | GET | startDate, endDate, groupBy?, format? | groups[], totalExpenses | OWNER | 403 |
| `/api/reports/profit-margins` | GET | startDate, endDate, page?, format? | orders[], avgMargin, pagination | OWNER | 403 |
| `/api/reports/cash-flow` | GET | startDate, endDate, compareWith?, format? | paymentsIn, expensesOut, netFlow, comparison | OWNER | 403 |
| `/api/reports/dashboard-summary` | GET | (none) | revenueThisMonth, outstandingTotal, netProfit | OWNER | 403 |
| `/api/settings/overhead` | GET | (none) | monthlyAmount | OWNER | 403 |
| `/api/settings/overhead` | PUT | monthlyAmount | monthlyAmount | OWNER | 403, 422 |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|--------|---------------------------|--------|
| Revenue total | SUM of order totals | `orders.total` WHERE status IN (CONFIRMED, IN_PRODUCTION, READY, COMPLETED) |
| Order count | COUNT of orders | `orders` WHERE status IN confirmed statuses AND `orderDate` in range |
| Average order value | revenue / count | Derived from revenue and count |
| Outstanding per order | order.total minus payments | `orders.total` − SUM(`payments.amount` for that order) |
| Aging bucket | days since confirmed | `CURRENT_DATE − orders.confirmedAt` |
| Material cost | actual or estimated | `orders.actualMaterialCost` (fallback `estimatedMaterialCost`) |
| Labor cost | actual or estimated | `orders.actualLaborCost` (fallback `estimatedLaborCost`) |
| Overhead per order | monthly / count | `overhead_settings.monthlyAmount` / COUNT(orders confirmed that month) |
| Profit margin | (revenue − costs) / revenue | Derived from order total minus material, labor, overhead |
| Payments received | SUM of payments | `payments.amount` WHERE `paymentDate` in range |
| Expenses paid | SUM of expenses | `expenses.amount` WHERE `expenseDate` in range |
| Comparison period dates | previous period or same last year | Derived from primary date range and `compareWith` param |

**Key invariants**:
- Outstanding balance = order.total − SUM(payments for order)
- Profit margin percentage = (revenue − total costs) / revenue × 100
- Reports only include orders in statuses CONFIRMED, IN_PRODUCTION, READY, COMPLETED (not QUOTATION or CANCELLED)
- Overhead per order is calculated monthly: all orders confirmed in the same month share the same overhead pool

**Security model**:
- All report endpoints require OWNER role via `@Roles('OWNER')` decorator
- Overhead settings require OWNER role
- No public endpoints
- No cross tenant concerns (single tenant system)

**Configuration required**:
- None. No new environment variables needed.

**Critical test scenarios**:
- Happy path: Owner views sales summary for this month, sees revenue, count, and average, verifies **AC-1**, **AC-15**
- Comparison: Owner views sales summary with previous period comparison, sees both periods and percentage change, verifies **AC-9**
- Export: Owner exports outstanding balances to PDF, file downloads with aging buckets, verifies **AC-10**, **AC-4**
- Drill down: Owner clicks customer row in sales by customer, navigates to customer profile, verifies **AC-13**
- Empty state: Owner views report for future month, sees zeros and empty state message, verifies **AC-16**
- Missing overhead: Owner views profit margins before setting overhead, sees margin without overhead with note, verifies **AC-18**
- Auth denied: STAFF user tries to access reports, receives 403 forbidden, verifies **AC-15**

## Build plan

Build approach: Tracer Bullet (end to end slices). Each slice delivers a working report from API to UI.

1. Create `overhead_settings` migration and API endpoints (GET/PUT `/api/settings/overhead`), satisfies **AC-7** (prerequisite), **AC-15**
2. Create `ReportsModule` with base service and controller structure, satisfies **AC-15**
3. Add Reports hub page (`/reports`) and sidebar links, satisfies **AC-11**
4. Implement sales summary report API and UI with date filters, satisfies **AC-1**, **AC-9**, **AC-12**
5. Add comparison period logic to sales summary, satisfies **AC-9**, **AC-17**
6. Implement outstanding balances report with aging buckets, satisfies **AC-4**, **AC-19**
7. Implement sales by customer report with pagination, satisfies **AC-2**, **AC-13**, **AC-19**
8. Implement sales by product report, satisfies **AC-3**
9. Implement income vs expense report with comparison, satisfies **AC-5**, **AC-9**
10. Implement expense breakdown report with groupBy, satisfies **AC-6**
11. Implement profit margins report with overhead calculation, satisfies **AC-7**, **AC-18**, **AC-19**
12. Implement cash flow report, satisfies **AC-8**
13. Add export functionality (print, PDF, Excel/CSV) to all reports, satisfies **AC-10**
14. Add dashboard summary widgets, satisfies **AC-14**
15. Add empty state handling to all reports, satisfies **AC-16**

## Consequences

**Positive**:
- Owner gains visibility into business performance without manual spreadsheet work
- Real time data means reports are always current
- Reuses existing data model; no data migration needed
- SheetJS already installed reduces bundle impact

**Negative / tradeoffs**:
- Real time queries may be slow for large date ranges (mitigated by pagination for detail reports)
- Adds Recharts (~45KB gzipped) and React PDF (~200KB) to client bundle
- Overhead allocation is simple (equal split per order); more sophisticated methods (by revenue, by labor hours) are not supported

**Neutral**:
- Reports are OWNER only; STAFF cannot view financial data
- One small migration for `overhead_settings` table

## Follow-up

- [ ] Consider caching or materialized views if report queries become slow at scale
- [ ] `yamban-design-system` conventions not yet in root AGENTS.md `## Rules`; these apply to every file in the project and belong at root level
