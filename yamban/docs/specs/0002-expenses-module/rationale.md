# Rationale: 0002. Expenses module

## Context

The shop tracks order related costs through the costing module (materials, electricity, labor). Operating expenses (rent, salaries, professional fees) are a different bucket: they are not tied to any single order and are recorded as they happen. The MVP spec (section 30) lists the expense categories and notes that material purchases flow through inventory, not through manual expense entry.

The database table `expenses` already exists with all required columns. The `EXPENSE_CATEGORIES` enum and its labels are defined in `packages/shared/src/enums.ts`. What is missing is the API module (controller, service), validation schemas, and the web pages for entry and listing.

The scope feature says "staff can record an expense with category, amount, date, and optional supplier; owner can list and filter expenses; expense categories match the MVP spec."

## Options considered

### Option 1: Summary in separate endpoint

Create `GET /expenses` for rows and `GET /expenses/summary` for totals. Two calls per page load.

**Pros**:
- Can refresh summary independently
- Cleaner separation of concerns

**Cons**:
- Two round trips on every page load
- Summary and list can drift if one call fails

### Option 2: Summary embedded in list response

`GET /expenses` returns `{ items, summary: { total, byCategory } }`. One call.

**Pros**:
- Single round trip, atomic data load
- Summary always matches the visible rows

**Cons**:
- Slightly larger response payload

## Decision rationale

The expense list is a page load, not a live dashboard. Staff don't refresh summaries while staring at the page; they land, glance, maybe filter. A single call that returns everything they see is simpler to build, simpler to cache, and never shows a stale summary next to fresh rows.
