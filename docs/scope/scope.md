# Yamban Scope

**Workflow:** Alpha

## At a glance

| Feature | Status |
|---------|--------|
| [Sales and financial reports](#sales-and-financial-reports) | in-progress |

---

## Sales and financial reports `in-progress`

**Intent**: Give the shop owner visibility into business performance through sales, financial, and profitability reports with charts and export options.

**Done when**: Owner can view all eight reports, compare periods, export to PDF/Excel, and see dashboard summary widgets.

**Spec**: [0002](../specs/0002-sales-financial-reports/index.md)

- [x] Design it (spec)
- [ ] Build it: /develop sales-financial-reports
  - [x] Overhead settings and reports module setup (AC-7, AC-15)
  - [x] Sales reports: summary, by customer, by product, outstanding balances (AC-1, AC-2, AC-3, AC-4)
  - [x] Financial reports: income/expense, breakdown, margins, cash flow (AC-5, AC-6, AC-7, AC-8)
  - [x] Exports and dashboard widgets (AC-10, AC-14)
  - [ ] Charts for trends and breakdowns (AC-12)
- [ ] Verify it: /check verify sales-financial-reports
- [ ] Test it: /test sales-financial-reports

**Code**: `apps/api/src/reports/`, `apps/web/src/app/(app)/reports/`, `apps/api/src/db/schema/finance.ts` (overhead_settings)
