# Scope: Yamban ERP

An ERP system for a sublimation and tailoring shop covering orders, inventory, production, costing, and expenses. Built for the shop owner and staff to replace paper forms and spreadsheets.

**Build approach:** Tracer Bullet (each feature built end to end through API and UI, working).
**Workflow:** Alpha (after /develop, run /check verify). The project default level of rigor. /architect is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· Beta`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use /develop and skip /architect. You decide when a feature is done._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Auth and sessions | Foundation | existing |
| B | Customers and organizations | Phase 1 | existing |
| C | Suppliers | Phase 1 | existing |
| D | Products, sizes, and recipes | Phase 1 | existing |
| E | Materials and inventory | Phase 1 | existing |
| F | Machines | Phase 1 | existing |
| G | Orders and order items | Phase 2 | existing |
| H | Payments | Phase 2 | existing |
| I | Material availability and reservation | Phase 2 | existing |
| J | Design jobs and files | Phase 3 | existing |
| K | Purchase requests | Phase 4 | existing |
| L | Inventory ledger and receiving | Phase 4 | existing |
| M | Production boards | Phase 5 | existing |
| N | Production stage transitions | Phase 5 | existing |
| O | Order costing | Phase 6 | existing |
| P | Production cost report | Phase 6 | existing |
| 1 | Expenses module | Phase 7 | done |
| 2 | Order profitability report | Phase 7 | done |
| 3 | Monthly business summary | Phase 7 | planned |
| 4 | Sales reports | Phase 7 | planned |
| 5 | Inventory reports | Phase 7 | planned |
| 6 | Production reports | Phase 7 | planned |

## Foundations (existing)

### A. Auth and sessions · existing
Cookie based JWT auth with access and refresh tokens. Roles: OWNER, STAFF, DESIGNER.
code in `apps/api/src/auth/`

### B. Customers and organizations · existing
Customer master with optional organization link.
code in `apps/api/src/customers/`

### C. Suppliers · existing
Supplier master for materials purchasing.
code in `apps/api/src/suppliers/`

### D. Products, sizes, and recipes · existing
Product catalog with size breakdown and material recipes per size.
code in `apps/api/src/products/`

### E. Materials and inventory · existing
Material master with stock on hand, moving average cost, and purchase unit conversion.
code in `apps/api/src/materials/`

### F. Machines · existing
Machine registry with power ratings for electricity cost calculation.
code in `apps/api/src/machines/`

## Phase 2: Sales (existing)

### G. Orders and order items · existing
Full order lifecycle from quotation through released. Order items with size breakdown and roster support.
code in `apps/api/src/orders/`

### H. Payments · existing
Payment recording with multiple methods. Optional down payments, balance tracking.
code in `apps/api/src/payments/`

### I. Material availability and reservation · existing
Live availability check during order entry. Reservation on confirmation, allocation by due date.
code in `apps/api/src/orders/` (integrated)

## Phase 3: Design (existing)

### J. Design jobs and files · existing
Design production jobs with file upload, simplified approval (upload then mark ready).
code in `apps/api/src/design/`

## Phase 4: Inventory (existing)

### K. Purchase requests · existing
Shortage driven purchase requests grouped by supplier. Print and receive workflow.
code in `apps/api/src/inventory/`

### L. Inventory ledger and receiving · existing
Transaction ledger for purchases, consumption, returns, adjustments, waste. Receiving against PRs.
code in `apps/api/src/inventory/`

## Phase 5: Production (existing)

### M. Production boards · existing
Kanban style boards for each production stage: Design, Printing, Heat Press, Sewing, Ready for Pickup.
code in `apps/web/src/app/(app)/production/`

### N. Production stage transitions · existing
Job start and complete with stage sequencing validation. Material consumption on stage start.
code in `apps/api/src/production/`

## Phase 6: Costing (existing)

### O. Order costing · existing
Estimated cost at confirmation, actual cost at ready. Materials, electricity, and labor with variance tracking.
code in `apps/api/src/costing/`

### P. Production cost report · existing
Monthly production cost aggregation for owner.
code in `apps/api/src/costing/`

## Phase 7: Expenses and Reports

### 1. Expenses module · done
Record general business expenses (salary, rent, utilities, fuel, etc.) separate from order material consumption. Entry, listing, and filtering by date, category, and supplier.
**Done when:** staff can record an expense with category, amount, date, and optional supplier; owner can list and filter expenses; expense categories match the MVP spec.
- [x] Design it (spec): `/architect expenses module`
- [x] Build it: `/develop expenses module`
   - [x] Schema migration and validation schemas (AC-1, AC-8)
   - [x] API module with CRUD and summary (AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7)
   - [x] Web pages: list with filters and form (AC-2, AC-3, AC-4, AC-7, AC-1, AC-5)
- [x] Verify it: `/check verify expenses module`
Spec [0002](../specs/0002-expenses-module/index.md)
code in `apps/api/src/expenses/` and `apps/web/src/app/(app)/expenses/`

### 2. Order profitability report · done
Show gross margin per order: selling price minus direct cost (materials, electricity, labor). Filter by date range and customer. Display estimated vs actual variance.
**Done when:** owner can view profitability for any order or date range; variance between estimated and actual cost is shown; report can be filtered by customer.
- [x] Design it (spec): `/architect order profitability report`
- [x] Build it: `/develop order profitability report`
   - [x] API: add customer filter and summary to costing endpoint (AC-4, AC-5)
   - [x] API: add isEstimated/variance fields, customers with orders endpoint (AC-2, AC-3, AC-4, AC-7)
   - [x] Web: report page with filters, table, summary panel (AC-1, AC-4, AC-5)
   - [x] Web: expandable rows with cost breakdown (AC-6)
- [x] Verify it: `/check verify order profitability report`
Spec [0003](../specs/0003-order-profitability-report/index.md)
code in `apps/api/src/costing/`, `apps/api/src/customers/`, and `apps/web/src/app/(app)/reports/profitability/`

### 3. Monthly business summary · needs a decision
Single page showing revenue, direct production cost, gross margin, and operating expenses for the month. The answer to "how did we do this month."
**Done when:** owner sees one page with sales total, production cost total, gross margin, expense total, and net result for a selected month.
- [ ] Design it (spec): `/architect monthly business summary`

### 4. Sales reports · needs a decision
Sales by customer, by product, by period. Answer "who bought what and when."
**Done when:** owner can see sales totals grouped by customer or product for a date range.
- [ ] Design it (spec): `/architect sales reports`

### 5. Inventory reports · needs a decision
Stock valuation (on hand quantity times average cost), low stock alerts, and material usage trends.
**Done when:** owner can see total inventory value, materials below reorder level, and usage over time.
- [ ] Design it (spec): `/architect inventory reports`

### 6. Production reports · needs a decision
Stage throughput, cycle time from confirmed to ready, and orders by production status.
**Done when:** owner can see how many orders passed through each stage, average time to complete, and current backlog by stage.
- [ ] Design it (spec): `/architect production reports`

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and /architect never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | /scope | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | /architect at spec capture | `Design it` ticked; spec linked; `Build it: /develop <feature>` + 2 to 5 milestones; the tier's closing boxes |
| `in-progress` (building) | /develop | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | /check verify | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is | boxes you ran ticked, skipped ones marked skipped |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run /architect first; otherwise straight to /develop. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's Build plan, not here**: the scope carries only the milestone rollup.
- **Status** `planned` to `in-progress` to `done`, plus `existing` (pre workflow) and `dropped` (de scoped, kept for history).
- **Workflow tier tag** beside a heading (e.g. `· Beta`) sets that one feature's rigor above or below the project default; no tag inherits the default.
