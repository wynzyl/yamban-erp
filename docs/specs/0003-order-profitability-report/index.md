# 0003. Order profitability report

**Date**: 2026-10-07
**Status**: Accepted

## Summary

This spec adds a report page showing gross margin per order: selling price minus direct production cost (materials, electricity, labor). The owner can filter by date range and customer, see estimated vs actual cost variance inline, and expand any row to view the full cost breakdown. The report reuses the existing costing API (spec 0001) with minor extensions: a customer filter and a summary object for aggregated totals.

## Requirements

**User stories**:
- As the owner, I want to see which orders made money and which lost money so I can adjust pricing or identify waste.
- As the owner, I want to compare estimated cost to actual cost so I can see where variance occurs.
- As the owner, I want to filter by customer and date range so I can analyze profitability by customer or period.

**Acceptance criteria** (the contract):
- **AC-1**: Owner can view a paginated list of orders (CONFIRMED, IN_PRODUCTION, READY, RELEASED) showing order number, customer name, date, revenue, total cost, gross profit, and margin percentage.
- **AC-2**: Each order row shows estimated cost when actual is not yet available (order not READY), marked with "est." indicator.
- **AC-3**: Each order row shows variance (actual cost minus estimated cost) when actual cost is known.
- **AC-4**: Owner can filter by date range (order date start and end), customer (dropdown of customers with confirmed orders), and search by order number.
- **AC-5**: A summary panel shows totals for the filtered set: total revenue, total cost, total gross profit, and average margin percentage.
- **AC-6**: Clicking an order row expands it inline to show the cost breakdown (materials, electricity, labor lines).
- **AC-7**: Staff and Designer roles cannot access the report page or the underlying API endpoint.

## Decision

**Chosen option**: Option 2: Extend existing costing endpoint

The costing infrastructure is already built and tested. Adding a customer filter and a summary object to the list response is a small extension that avoids duplicating the profit/margin calculation logic. The inline detail expansion uses the existing detail endpoint, so the breakdown is consistent with what appears on the order detail page.

## Rationale

See `rationale.md` for the full decision record.

## Feature design

**Data model sketch**:

No schema changes. This feature reads from existing tables and columns:

| Entity | Fields used | Notes |
|--------|-------------|-------|
| `orders` | `id`, `orderNumber`, `orderDate`, `status`, `total`, `customerId`, `estimatedMaterialCost`, `estimatedElectricityCost`, `estimatedLaborCost`, `actualMaterialCost`, `actualElectricityCost`, `actualLaborCost` | All exist from spec 0001 |
| `customers` | `id`, `firstName`, `lastName` | For filter dropdown and display |
| `orderMaterials`, `orderItemLabor`, `orderItemProcesses` | All fields | For inline cost breakdown (via existing `getOrderCostDetail`) |

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|----------|--------|------------|-------------|------|------------|
| `GET /costing/orders` | GET | `startDate`, `endDate`, `customerId` (NEW), `search`, `status`, `page`, `limit` | `{ items: OrderCostSummary[], summary: ProfitabilitySummary, page, pageSize, total }` | Owner | 400 invalid params |
| `GET /costing/orders/:id` | GET | `id` (path) | `OrderCostDetail` (existing) | Owner | 404 not found |
| `GET /customers/with-orders` | GET | none | `{ id, firstName, lastName }[]` | Owner | none |

**New types** (added to response):

```typescript
interface ProfitabilitySummary {
  totalRevenue: string;      // sum of orders.total for ALL matching orders
  totalCost: string;         // sum of (actual or estimated) cost
  totalProfit: string;       // totalRevenue - totalCost
  avgMarginPercent: string;  // (totalProfit / totalRevenue) * 100
  orderCount: number;        // count of matching orders
}
```

**Value sourcing**:

| Action | Value produced / displayed | Source |
|--------|---------------------------|--------|
| List orders | `revenue` per order | `orders.total` column |
| List orders | `totalCost` per order | `orders.actualMaterialCost + actualElectricityCost + actualLaborCost` when ALL THREE actual columns are non null, else sum of all three estimated columns |
| List orders | `profit` per order | `revenue - totalCost`, computed in service |
| List orders | `marginPercent` per order | `(profit / revenue) * 100`, computed in service |
| List orders | `isEstimated` flag | `true` when ANY of the three actual cost columns is NULL |
| List orders | `variance` per order | `(actualTotal - estimatedTotal)` when all three actual columns are non null, else null (UI shows dash) |
| Summary | `totalRevenue` | `SUM(orders.total)` for all filtered orders (not just current page) |
| Summary | `totalCost` | `SUM(actual or estimated cost)` for all filtered orders |
| Summary | `totalProfit` | `totalRevenue - totalCost` |
| Summary | `avgMarginPercent` | `(totalProfit / totalRevenue) * 100` |
| Customer dropdown | `options` | `SELECT DISTINCT c.id, c.firstName, c.lastName FROM customers c INNER JOIN orders o ON o.customerId = c.id WHERE o.status IN ('CONFIRMED', 'IN_PRODUCTION', 'READY', 'RELEASED')` |
| Inline detail | materials, electricity, labor lines | `CostingService.getOrderCostDetail(orderId)` (existing) |

**Key invariants**:
- Summary totals are computed over ALL filtered orders, not just the current page (accurate totals regardless of pagination)
- Cost is computed as actual only when ALL THREE actual columns are populated; if ANY actual column is NULL, use all three estimated columns (never mix actual and estimated components)
- Customer dropdown shows only customers with at least one CONFIRMED or later order
- Empty result sets show zeros for revenue/cost/profit, but `avgMarginPercent` is null (UI displays "N/A")
- Variance column shows a dash when cost is estimated (no actual data to compare)
- Date range defaults to current month (start: 1st of month, end: today) when not specified; both are optional

**Security model**:
- `GET /costing/orders` (with summary): Owner role only (`@Roles('OWNER')`)
- `GET /costing/orders/:id`: Owner role only (already enforced, verify)
- `GET /customers/with-orders`: Owner role only
- Staff and Designer receive 403 Forbidden
- Report page (`/reports/profitability`) checks role client side and redirects non owners

**Configuration required**:
None. No new environment variables or third party credentials.

**Critical test scenarios**:
- Happy path: owner views report with date filter, sees orders with correct profit/margin calculated, summary shows accurate totals, verifies **AC-1**, **AC-4**, **AC-5**
- Estimated indicator: order in IN_PRODUCTION status shows "est." badge and uses estimated cost values, verifies **AC-2**
- Variance display: READY order shows variance (actual minus estimated) in the row, verifies **AC-3**
- Inline expand: clicking order row fetches detail and shows materials/electricity/labor breakdown, verifies **AC-6**
- Access denied: staff user attempts to access report page and API, receives 403, verifies **AC-7**
- Empty state: filter returns no orders, summary shows zeros, message says "No orders found for this period"

## Build plan

1. Add `customerId` filter param to `listOrderCosts` query in `CostingService`, satisfies **AC-4**
2. Add summary aggregation to `listOrderCosts` response (new SQL query for totals across all matching orders), satisfies **AC-5**
3. Add `isEstimated` and `variance` fields to `OrderCostSummary` response type, satisfies **AC-2**, **AC-3**
4. Update `listCostingQuerySchema` in shared package to include `customerId` (optional uuid), satisfies **AC-4**
5. Verify `@Roles('OWNER')` is applied to costing controller endpoints, add if missing, satisfies **AC-7**
6. Create `GET /customers/with-orders` endpoint returning customers with confirmed orders (for dropdown), satisfies **AC-4**
7. Create report page at `/reports/profitability` with month picker, customer dropdown, search input, satisfies **AC-4**
8. Build order list table component showing revenue, cost, profit, margin, variance, with "est." badge when estimated, satisfies **AC-1**, **AC-2**, **AC-3**
9. Build summary panel component showing totals above the table, satisfies **AC-5**
10. Add expandable row with cost breakdown (fetch detail on expand, show materials/electricity/labor), satisfies **AC-6**
11. Add role guard to report page redirecting non owners to dashboard, satisfies **AC-7**

## Consequences

**Positive**:
- Owner gets a dedicated view to answer "was this order profitable?" without mental math
- Variance visibility helps identify orders where estimates were off (fabric waste, labor underestimate)
- Customer filter enables profitability analysis per customer relationship
- Summary totals give quick insight into overall margin for a period

**Negative / tradeoffs**:
- Summary query runs over all matching orders regardless of page size (adds ~10ms for large result sets, acceptable for a report view)
- Another endpoint on the costing controller (minor complexity increase)

**Neutral**:
- Reuses existing costing logic, no new calculation patterns to maintain
- The inline detail is the same breakdown shown on order detail page (consistency)

## Follow up

- [ ] Consider adding CSV export for the report (owner may want to analyze in a spreadsheet)
- [ ] Consider margin threshold highlighting (red for negative margin, yellow for below target)
