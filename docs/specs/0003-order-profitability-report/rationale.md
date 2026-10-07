# Rationale: Order profitability report

## Context

The shop now tracks production costs per order (spec 0001: estimated at confirmation, actual when production completes). The owner needs a dedicated surface to answer "was this order profitable?" without mentally doing the math on every order detail page. The production cost report (spec 0001) aggregates costs by month, but the owner also wants to see profitability per order, spot unprofitable jobs, compare margins across customers, and see variance between what was estimated and what actually happened.

The costing infrastructure already exists: the six cost columns on orders, the `orderItemLabor` table, and the `CostingService` that computes profit and margin. This feature is a read only UI surface over that data, plus a summary panel to show totals for the filtered set.

## Options considered

### Option 1: New dedicated reporting endpoint

Create `GET /reports/order-profitability` with its own query logic and response shape, separate from the existing costing endpoints.

**Pros**:
- Clean separation between operational costing views and reporting views
- Can optimize the query specifically for reporting use cases

**Cons**:
- Duplicates logic that already exists in `CostingService`
- Two endpoints to maintain for similar data
- The inline detail expansion would still need to call the existing `GET /costing/orders/:id`

### Option 2: Extend existing costing endpoint

Add customer filter and summary aggregation to the existing `GET /costing/orders` endpoint. Use `GET /costing/orders/:id` for the inline detail expansion.

**Pros**:
- Reuses proven, tested logic
- Single source of truth for order cost calculations
- Inline detail uses the same endpoint the order detail page already uses

**Cons**:
- The costing endpoint grows slightly more complex (one new filter, one new response field)

## Rationale

The `CostingService` already computes everything this report needs: revenue, cost components, profit, margin, and variance. Building a separate reporting module would mean duplicating that logic or calling it indirectly, with no real benefit. The existing endpoint already filters by date range, status, and search; adding customer filter is a minor extension. The summary is a natural addition since the UI needs totals for the filtered set, not just the current page.
