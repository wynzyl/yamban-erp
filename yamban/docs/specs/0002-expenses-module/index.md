# 0002. Expenses module

**Date**: 2026-10-07
**Status**: Accepted

## Summary

This spec adds the expenses module: an API and UI for recording, listing, and filtering general business expenses (salary, rent, utilities, fuel, and so on) separate from order material purchases. Staff and owner can record expenses; owner sees totals by category and can filter by month and category. The schema already exists; this builds the missing controller, service, validation schemas, and web pages.

## Requirements

**User stories**:
- As a staff member, I want to record an expense with its category, amount, date, and description so the books stay current.
- As the owner, I want to see this month's expenses by category so I know where the money is going.
- As the owner, I want to filter expenses by month and category so I can review specific periods or cost types.

**Acceptance criteria** (the contract):
- **AC-1**: Staff and owner can create an expense with required fields: date, category, amount, payment method, description. Supplier and order link are optional.
- **AC-2**: Expense list shows all expenses for the selected month, ordered by date descending.
- **AC-3**: Expense list includes a summary panel showing total amount and breakdown by category for the selected month.
- **AC-4**: Owner can filter by one or more categories (multi select).
- **AC-5**: Creator can edit their own expense on the same day; owner can edit any expense anytime.
- **AC-6**: Only owner can delete an expense.
- **AC-7**: The list supports search by description, supplier name, and order number.
- **AC-8**: Schema migration adds `updatedAt` column for edit audit.

## Decision

**Chosen option**: Option 2: Summary embedded in list response

The expense list page needs both rows and summary in sync. A single endpoint keeps them atomic and halves the network calls. The payload increase is negligible (13 category totals).

## Feature design

**Data model sketch**:

The `expenses` table already exists. This spec adds one column:

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | no | PK |
| expenseDate | date | no | When the expense occurred |
| category | expenseCategory | no | One of 13 fixed categories |
| supplierId | uuid | yes | FK to suppliers |
| amount | numeric(14,2) | no | Positive, check constraint |
| paymentMethod | paymentMethod | no | CASH, GCASH, BANK_TRANSFER, CHECK |
| description | text | no | What the expense was for |
| orderId | uuid | yes | FK to orders (for shipping, rush fees) |
| createdById | uuid | yes | FK to users |
| createdAt | timestamp | no | Row creation time |
| **updatedAt** | timestamp | yes | **NEW**: set on update |

Relationships: expense belongs to supplier (optional), order (optional), user (creator).

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|----------|--------|------------|-------------|------|------------|
| /expenses | GET | month (YYYY-MM), categories[] (opt), search (opt), page, pageSize | items[], summary, pagination | authenticated | 400 invalid month |
| /expenses/:id | GET | id | expense detail with supplier and order names | authenticated | 404 not found |
| /expenses | POST | expenseDate, category, amount, paymentMethod, description, supplierId?, orderId? | created expense | authenticated | 422 validation error |
| /expenses/:id | PATCH | any subset of create fields | updated expense | authenticated | 403 forbidden, 404 not found |
| /expenses/:id | DELETE | id | void | owner only | 403 forbidden, 404 not found |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|--------|---------------------------|--------|
| List expenses | month for filtering | query param `month`, defaults to current month from server clock |
| List expenses | category labels | `EXPENSE_CATEGORY_LABELS` from `packages/shared` |
| List expenses | total and byCategory summary | computed in SQL from filtered rows |
| List expenses | supplier name | joined from suppliers table |
| Create expense | createdById | `@CurrentUser('id')` decorator |
| Edit check | whether user may edit | compare `createdById` to current user, check role for owner, compare `createdAt` date to today |
| Delete check | whether user may delete | current user role is OWNER |

**Key invariants**:
- Amount is always positive (DB check constraint, already exists)
- Category is never null (DB not null, already exists)
- Only creator can edit same day; owner can edit anytime
- Only owner can delete

**Security model**:
- Create: OWNER or STAFF (auth required, any logged in user except DESIGNER)
- Read list and detail: OWNER or STAFF
- Update: creator on same day OR owner
- Delete: OWNER only

No compliance scope; expenses are internal bookkeeping, not customer PII.

**Configuration required**:
None. No new environment variables or third party credentials.

**Critical test scenarios**:
- Happy path: staff creates expense, appears in list with correct category, verifies **AC-1**, **AC-2**
- Summary accuracy: create two expenses in different categories, summary shows correct totals, verifies **AC-3**
- Edit permission: staff edits own expense same day succeeds, next day fails with 403, verifies **AC-5**
- Delete permission: staff delete returns 403, owner delete succeeds, verifies **AC-6**
- Filter: select two categories, only those appear, verifies **AC-4**

## Build plan

1. Add `updatedAt` column to expenses table (migration), satisfies **AC-8**
2. Create Zod schemas in `packages/shared/src/schemas/expense.ts` (createExpenseSchema, updateExpenseSchema, listExpenseQuerySchema), satisfies **AC-1**, **AC-4**
3. Create expenses module: `apps/api/src/expenses/expenses.module.ts`, `expenses.service.ts`, `expenses.controller.ts` with list, get, create, update, delete, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**
4. Implement edit and delete authorization logic in service (same day creator check, owner check), satisfies **AC-5**, **AC-6**
5. Create expense list page at `apps/web/src/app/(app)/expenses/page.tsx` with month picker, category filter, search, summary panel, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-7**
6. Create expense form page at `apps/web/src/app/(app)/expenses/new/page.tsx` and edit at `expenses/[id]/edit/page.tsx`, satisfies **AC-1**, **AC-5**

## Consequences

**Positive**:
- Shop can finally track where operating money goes
- Owner gets visibility into monthly expense breakdown
- Expense data feeds the monthly business summary report (Phase 7 feature #3)

**Negative / tradeoffs**:
- Staff cannot delete their mistakes; must ask owner or correct via edit
- No receipt upload in this spec (add as follow up if needed)

**Neutral**:
- One migration to add `updatedAt`
- New module follows existing patterns (mirrors payments module structure)

## Follow up

- [ ] Receipt upload: if the shop wants to attach receipt images, design a follow up spec for file storage on expenses
- [ ] Update navigation to include expenses under Finance section (nav.ts already has the structure, just needs the routes to exist)
