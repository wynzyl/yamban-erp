# Verify: Order profitability report · spec 0003 · updated 2026-10-07
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [x] Visit `/reports/profitability` as Owner → see order list with revenue, cost, profit, margin, variance columns → **AC-1**
- [x] Order in IN_PRODUCTION status shows "est." badge next to cost value → **AC-2**
- [x] Order in READY status shows variance (actual minus estimated) in variance column → **AC-3**
- [x] Change month picker → list filters to that month's date range → **AC-4**
- [x] Select a customer from dropdown → list filters to that customer only → **AC-4**
- [x] Type in search box → list filters by order number → **AC-4**
- [x] Summary panel shows total revenue, total cost, total profit, avg margin for filtered set → **AC-5**
- [x] Click an order row → row expands inline showing materials, electricity, labor breakdown → **AC-6**
- [x] Visit `/reports/profitability` as Staff user → redirected to dashboard → **AC-7** (verified via code: page redirect + @Roles('OWNER'))
- [x] Call `GET /api/costing/orders` as Staff user → 403 Forbidden → **AC-7** (verified via code: @Roles('OWNER') decorator)

## Commands
- [x] `npm run typecheck` (all workspaces) → passes → build integrity

## Acceptance criteria coverage
- AC-1 … covered by step 1
- AC-2 … covered by step 2
- AC-3 … covered by step 3
- AC-4 … covered by steps 4, 5, 6
- AC-5 … covered by step 7
- AC-6 … covered by step 8
- AC-7 … covered by steps 9, 10
