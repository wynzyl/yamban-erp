# 0002. Sales and financial reports — Rationale

## Context

The Yamban shop system tracks orders, payments, expenses, and inventory but provides no aggregated view of business performance. The owner currently relies on manual spreadsheet work or mental math to understand revenue trends, outstanding collections, and profitability.

Key forces shaping this decision:
- **Visibility need**: The owner needs to answer basic business questions (How much did we make this month? Who owes us money? Which products sell best?) without exporting data and building spreadsheets.
- **Existing data**: Orders, payments, and expenses are already recorded with timestamps, costs, and relationships. The raw data exists; it just needs aggregation.
- **Single user type**: Only the owner needs these reports. Staff see operational views (orders, production queues) but not financials.
- **Export requirements**: The owner sometimes needs to share reports (with an accountant, for records) in PDF or Excel format.
- **Cost tracking**: Orders already capture material and labor costs at confirmation. Overhead (rent, utilities) is tracked as expenses but not allocated to individual orders.

The consequence of not deciding: The owner continues without clear business metrics, making pricing and collection decisions on intuition rather than data.

## Options considered

### Option 1: Real time queries with client side rendering

Compute all reports on demand from live database queries. Use a React charting library for visualizations and client side libraries for PDF/Excel export. No pre-computed data.

**Pros**:
- Always current, no stale data concerns
- No new infrastructure (cron jobs, background workers)
- Simpler to build and maintain

**Cons**:
- Large date ranges may be slow
- Each page load re-runs the query

### Option 2: Pre-computed daily/monthly snapshots

Run a nightly job to compute and store report summaries in dedicated tables. Reports read from these snapshots.

**Pros**:
- Fast reads regardless of date range
- Can store historical snapshots indefinitely

**Cons**:
- Data is up to 24 hours stale
- Adds background job infrastructure
- Snapshot tables add schema complexity
- Harder to debug discrepancies between live and snapshot data

### Option 3: Hybrid with caching layer

Compute reports on demand but cache results (in memory or Redis) for a short period (5 to 15 minutes).

**Pros**:
- Fresh enough for most use cases
- Faster repeated views

**Cons**:
- Adds caching infrastructure
- Cache invalidation complexity when payments or expenses are added
- Still slow on first load for large ranges

## Rationale

Option 1 (real time queries) fits the constraints best. The shop processes dozens of orders per month, not thousands, so query performance is not a concern. The owner checks reports occasionally, not continuously, so the cost of re-running queries is acceptable. Adding background jobs or a caching layer would complicate operations for marginal benefit.

The main risk with real time queries (slow performance at scale) is mitigated by pagination for detail reports (by customer, by order) and by limiting the most expensive aggregations to reasonable date ranges. If this becomes a problem, caching or snapshots can be added later without changing the report interfaces.

For charting, Recharts is chosen over Chart.js or Visx because it is React native (declarative, composable), well documented, and already proven in production dashboards. For PDF generation, React PDF allows defining reports as React components, which keeps the PDF layout close to the web layout and is easier to maintain than imperative PDF libraries. For Excel/CSV, SheetJS is already installed for roster import, so reusing it avoids adding another dependency.

The overhead setting is kept simple (a single monthly value) because more sophisticated allocation methods (by revenue, by labor hours, by square footage) add complexity without proportional benefit for a small shop. The owner sets one number; it divides equally across orders confirmed that month. This is accurate enough for internal decision making and can be refined later if needed.
