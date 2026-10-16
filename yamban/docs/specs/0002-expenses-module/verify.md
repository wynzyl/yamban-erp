# Verify: Expenses module · spec 0002 · updated 2026-10-07

_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Visit `/expenses/new` → create an expense with date, category, amount, method, description → appears in list → AC-1
- [x] List shows expenses for the current month, ordered by date descending → AC-2
- [x] Summary panel shows total amount and breakdown by category for the month → AC-3
- [x] Use category dropdown to filter by one category → only that category's expenses appear → AC-4
- [ ] As staff, create an expense → edit it same day succeeds → AC-5 (not tested, no staff user)
- [ ] As staff, try to edit an expense from a previous day → expect 403 Forbidden → AC-5 (not tested, no staff user)
- [x] As owner, edit any expense anytime → succeeds → AC-5
- [ ] As staff, try to delete an expense → expect 403 Forbidden → AC-6 (not tested, no staff user)
- [x] As owner, delete an expense → succeeds → AC-6
- [x] Search by description, supplier name, or order number → matching expenses appear → AC-7

## Commands

- [x] `npm run typecheck` → passes → all types valid
- [x] `npm run db:generate -- --name add-expense-updated-at` → migration file created → AC-8
- [x] `npm run db:migrate` → migration applied → updatedAt column exists

## Value sourcing (exercises each source)

- [x] Change browser month picker → month param updates in URL → filtered list changes → source: query param
- [x] Create expense without selecting supplier → supplierId is null → supplier name shows "—" → source: left join
- [x] Create expense → createdById matches logged in user → source: @CurrentUser('id')
- [x] Summary total matches sum of visible row amounts → source: SQL aggregation

## Acceptance criteria coverage

- AC-1 covered by: create expense form, API POST endpoint
- AC-2 covered by: list page month filter, orderBy desc
- AC-3 covered by: summary panel in list page, API summary response
- AC-4 covered by: category filter dropdown
- AC-5 covered by: edit form with permission checks in service
- AC-6 covered by: delete button (owner only), @Roles('OWNER') guard
- AC-7 covered by: search input, ilike on description/supplier/order
- AC-8 covered by: updatedAt column in schema
