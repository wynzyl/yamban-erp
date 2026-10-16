# 0001. Production cost computation

**Date**: 2026-10-06
**Status**: Proposed

## Summary

This spec adds automatic computation of production costs (materials, electricity, labor) for every order. The system calculates estimated cost at order confirmation for pricing decisions and actual cost when production completes for variance analysis. Costs are visible only to the Owner role, displayed on the order detail page and order list, plus a monthly production cost report page.

## Context

The shop needs to know what each order costs to produce so the owner can set profitable prices and track whether production stays within estimates. The existing schema already captures the raw ingredients for cost calculation: `orderMaterials` snapshots the recipe with unit costs, `orderItemProcesses` snapshots machine minutes and power consumption, and `electricityRatePerKwh` is stored on the order at confirmation. What is missing is:

1. Labor cost tracking (per piece rates for each production stage)
2. Computed cost totals on the order (estimated vs actual)
3. A monthly report aggregating costs for business review

The shop runs sublimation and tailoring, where fabric is the main variable cost (waste happens at heat press). Ink, paper, and thread follow the recipe closely. Labor is a per piece cost that varies by product and stage (sewing a polo shirt differs from sewing a jersey). Electricity cost is derived from machine run time.

## Requirements

**User stories**:
- As the owner, I want to see the estimated production cost of an order before I finalize the price so I know my margin.
- As the owner, I want to compare actual cost to estimated cost after production so I can spot waste and improve estimates.
- As the owner, I want a monthly report of production costs so I can track profitability over time.

**Acceptance criteria** (the contract):
- **AC-1**: When an order is confirmed, the system computes and stores estimated production cost (materials + electricity + labor) using the recipe, electricity rate, and labor rates in effect.
- **AC-2**: Cost breakdown shows four line items: materials (inks, papers, fabric), electricity (from machine run time), and labor (per piece rate per product per stage).
- **AC-3**: After production completes (order reaches READY status), actual cost is computed automatically, with fabric using `actualFabricUsed` from the HEAT_PRESS job when recorded (else falling back to the estimate).
- **AC-4**: Order detail page displays cost breakdown (estimated vs actual with variance, in pesos) to Owner role only.
- **AC-5**: Order list includes a total production cost column visible to Owner only.
- **AC-6**: A monthly production cost report page shows cost breakdown and variance aggregated by month, accessible to Owner only.
- **AC-7**: Staff and Designer roles do not see any cost data (columns, breakdown, or report).

## Options considered

### Option 1: Computed on demand (no storage)

Calculate costs from `orderMaterials`, `orderItemProcesses`, and a new `orderItemLabor` table each time the UI requests them. No cost columns on the orders table.

**Pros**:
- No denormalized data to keep in sync
- Always reflects current unit costs (though this is actually a con for historical accuracy)

**Cons**:
- Expensive queries on every order list load (joins across multiple tables)
- Actual fabric variance cannot use historical unit cost at confirmation time
- Order list pagination becomes slow with cost aggregation

### Option 2: Store cost breakdown on orders table

Add six columns to orders: `estimatedMaterialCost`, `estimatedElectricityCost`, `estimatedLaborCost`, and their actual counterparts. Populate estimated at confirmation, actual when production completes.

**Pros**:
- Fast order list queries (cost is a simple column read)
- Historical cost preserved at the rate in effect at confirmation
- Variance is trivial to compute (actual minus estimated)

**Cons**:
- Denormalized data requires updates at two points (confirmation and READY status)

### Option 3: Separate orderCosts table (one to one)

A dedicated table with order_id FK holding the cost breakdown, instead of columns on orders.

**Pros**:
- Cleaner schema separation

**Cons**:
- Extra join for every cost read, no meaningful benefit over columns
- More complex writes (insert vs update)

## Decision

**Chosen option**: Option 2: Store cost breakdown on orders table

Store six cost columns directly on orders. The denormalization is justified by the read pattern (order list with costs) and the small write surface (two update points: confirmation and READY status). This matches the existing pattern where `subtotal`, `total`, `electricityRatePerKwh` are already on the orders table.

## Rationale

The order list is the most frequently loaded view in the app. Adding cost aggregation queries to every list request would hurt performance and complicate pagination. Storing costs on the orders table follows the existing pattern (totals, rate snapshots) and keeps the read path fast. The two update points (confirmation trigger for estimated, READY status trigger for actual) are well defined lifecycle events already handled by the order status logic.

Option 1's "always current" calculation is actually undesirable: we want the cost at confirmation time, not today's rates applied retroactively. Option 3 adds schema complexity without benefit.

## Feature design

**Data model sketch**:

| Entity | Field | Type | Nullable | Notes |
|--------|-------|------|----------|-------|
| `productStages` (existing) | `laborRatePerPiece` | money (14,2) | yes | new column, defaults to null (uses stage default) |
| `orders` (existing) | `estimatedMaterialCost` | money (14,2) | yes | new, set at confirmation |
| `orders` (existing) | `estimatedElectricityCost` | money (14,2) | yes | new, set at confirmation |
| `orders` (existing) | `estimatedLaborCost` | money (14,2) | yes | new, set at confirmation |
| `orders` (existing) | `actualMaterialCost` | money (14,2) | yes | new, set at READY |
| `orders` (existing) | `actualElectricityCost` | money (14,2) | yes | new, set at READY |
| `orders` (existing) | `actualLaborCost` | money (14,2) | yes | new, set at READY |
| `defaultLaborRates` (new) | `id` | uuid PK | no | |
| `defaultLaborRates` (new) | `stage` | productionStage enum | no | unique |
| `defaultLaborRates` (new) | `ratePerPiece` | money (14,2) | no | fallback when product has no rate |
| `orderItemLabor` (new) | `id` | uuid PK | no | |
| `orderItemLabor` (new) | `orderItemId` | uuid FK → orderItems | no | |
| `orderItemLabor` (new) | `stage` | productionStage enum | no | |
| `orderItemLabor` (new) | `quantity` | integer | no | pieces processed at this stage |
| `orderItemLabor` (new) | `laborRatePerPiece` | money (14,2) | no | snapshotted rate |
| `orderItemLabor` (new) | `totalLaborCost` | money (14,2) | no | quantity × rate |

**Constraints**:
- `orderItemLabor` unique on `(orderItemId, stage)`
- `defaultLaborRates` unique on `stage`

**Relationships**:
- `orderItems` 1:N `orderItemLabor`
- `products` 1:N `productStages` (existing, now with `laborRatePerPiece`)

**State transitions**: None new. Cost computation hooks into existing order status transitions:
- `QUOTATION → CONFIRMED`: populate estimated costs, snapshot labor into `orderItemLabor`
- `IN_PRODUCTION → READY`: populate actual costs

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|----------|--------|------------|-------------|------|------------|
| `PATCH /api/product-stages/:id` | PATCH | `laborRatePerPiece` | updated stage | Owner | 404, 422 |
| `GET /api/labor-rates` | GET | none | products with stage labor rates | Owner | none |
| `PATCH /api/labor-rates/defaults` | PATCH | `{ stage, ratePerPiece }[]` | updated defaults | Owner | 422 |
| `GET /api/orders/:id` | GET | none | order with cost breakdown (when owner) | any role | 404 |
| `GET /api/orders` | GET | filters, pagination | order list with cost column (owner only) | any role | none |
| `GET /api/reports/production-cost` | GET | `month` (YYYY-MM) | monthly cost breakdown | Owner | 422 |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|--------|---------------------------|--------|
| Confirm order | `estimatedMaterialCost` | SUM of `orderMaterials.totalCost` (already snapshotted) |
| Confirm order | `estimatedElectricityCost` | SUM of (`orderItemProcesses.minutesPerPiece` × `quantity` × `powerKw` / 60 × `orders.electricityRatePerKwh`) |
| Confirm order | `estimatedLaborCost` | SUM of `orderItemLabor.totalLaborCost` (snapshotted at confirmation) |
| Confirm order | `orderItemLabor.laborRatePerPiece` | `productStages.laborRatePerPiece` if set, else `defaultLaborRates.ratePerPiece` for that stage |
| Set order READY | `actualMaterialCost` | Same as estimated, except fabric lines where `productionJobs.actualFabricUsed` is recorded use `actualFabricUsed × orderMaterials.unitCost` |
| Set order READY | `actualElectricityCost` | Same as estimated (no actual machine time tracking) |
| Set order READY | `actualLaborCost` | Same as estimated (no actual hours tracking) |
| Order detail | variance | `actual - estimated` for each component |
| Monthly report | monthly totals | SUM of order costs for orders with `confirmedAt` in the month |

**Key invariants**:
- Cost columns on orders are null until computed (estimated null until confirmed, actual null until READY)
- `orderItemLabor` rows created only at confirmation, never updated afterward
- Labor rate fallback: product's stage rate if set, else default stage rate, else zero
- All cost values use `money` (numeric 14,2), formatted with `formatMoney()`, never parsed as float for arithmetic

**Security model**:
- Cost columns, cost breakdown endpoint, and production cost report: Owner role only
- Staff and Designer see orders and jobs but cost fields are omitted from their responses
- Labor rate management (product stages, defaults): Owner only

**Configuration required**:
- None. Default labor rates are seeded in the database and editable via the UI.

**Critical test scenarios**:
- Happy path: confirm an order with products that have stage labor rates; estimated costs are populated correctly, verifies **AC-1**, **AC-2**
- Fallback path: confirm an order where a product stage has no labor rate; uses default stage rate, verifies **AC-1**
- Actual cost: move an order to READY with `actualFabricUsed` recorded; actual material cost reflects fabric variance, verifies **AC-3**
- Actual cost fallback: move to READY without `actualFabricUsed`; actual equals estimated, verifies **AC-3**
- Role filtering: Staff views order detail; cost fields are not present in response, verifies **AC-7**
- Monthly report: query report for a month; returns aggregated costs, verifies **AC-6**

## Build plan

1. Add `laborRatePerPiece` column to `productStages` table (migration), satisfies **AC-1**
2. Create `defaultLaborRates` table with seed data for all production stages (migration + seed), satisfies **AC-1**
3. Create `orderItemLabor` table (migration), satisfies **AC-1**, **AC-2**
4. Add six cost columns to `orders` table (migration), satisfies **AC-1**, **AC-3**
5. Implement cost calculation service: `computeEstimatedCosts()` and `computeActualCosts()` functions, satisfies **AC-1**, **AC-2**, **AC-3**
6. Hook `computeEstimatedCosts()` into order confirmation logic (create `orderItemLabor` rows, populate estimated columns), satisfies **AC-1**
7. Hook `computeActualCosts()` into order status transition to READY, satisfies **AC-3**
8. Add `GET /api/labor-rates` and `PATCH /api/labor-rates/defaults` endpoints for managing default rates, satisfies **AC-1**
9. Update `PATCH /api/product-stages/:id` to accept `laborRatePerPiece`, satisfies **AC-1**
10. Update `GET /api/orders/:id` to include cost breakdown for Owner role only, satisfies **AC-4**, **AC-7**
11. Update `GET /api/orders` to include cost column for Owner role only, satisfies **AC-5**, **AC-7**
12. Create `GET /api/reports/production-cost` endpoint with monthly aggregation, satisfies **AC-6**
13. Add labor rate inline editing to product stages UI, satisfies **AC-1**
14. Add labor rates summary page under settings, satisfies **AC-1**
15. Add cost breakdown panel to order detail page (Owner only), satisfies **AC-4**
16. Add cost column to order list (Owner only), satisfies **AC-5**
17. Create monthly production cost report page, satisfies **AC-6**

## Consequences

**Positive**:
- Owner can see production cost before confirming an order, enabling informed pricing
- Variance tracking identifies fabric waste and informs recipe adjustments
- Monthly report supports profitability analysis without spreadsheet exports

**Negative / tradeoffs**:
- Six new nullable columns on orders table (minor schema expansion)
- Cost calculation runs synchronously at confirmation and READY status (adds ~10ms to each transition, acceptable)
- Labor rates must be configured per product for accurate costing (setup effort)

**Neutral**:
- Actual electricity and labor cost equal estimated (no variance tracking for those components yet); this can be extended later if the shop starts tracking actual machine time or worker hours
- Historical orders before this feature have null cost columns; backfill is possible but not required

## Follow-up

- [ ] Seed realistic default labor rates with the shop owner during onboarding
- [ ] Consider adding actual machine time tracking to production jobs for electricity variance (future enhancement)
