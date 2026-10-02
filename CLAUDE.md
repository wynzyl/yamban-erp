# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Yamban is an ERP system for a sublimation and tailoring shop: orders, inventory, collections, and expenses. It's a monorepo with NestJS API, Next.js web app, PostgreSQL, and a shared package.

The product spec is the MVP specification v3; the visual rules are the Yamban guideline v0.1. When they disagree, ask.

## Commands

```bash
# Development
npm run dev                           # Start web (:3000) and API (:4000)
npm run build                         # Build all (shared first)
npm run typecheck                     # Type-check all workspaces
npm run lint                          # Lint all workspaces
npm run test                          # Run all tests
npm run test -w @yamban/api           # Run API tests only

# Database (Postgres in Docker)
npm run db:up                         # Start Postgres container
npm run db:down                       # Stop container
npm run db:generate -- --name <name>  # Generate migration after schema edit
npm run db:migrate                    # Apply migrations
npm run db:seed                       # Create owner account + example data
npm run db:studio                     # Browse/edit data in Drizzle Studio

# UI
npm run check:ui                      # Must pass before committing UI work
```

## Architecture

```
apps/api          NestJS 12 (ESM) · Drizzle ORM · PostgreSQL · cookie-based JWT
apps/web          Next.js 16 (App Router) · Tailwind CSS v4 · shadcn/ui
packages/shared   Enums, Zod schemas, formatters (used by both apps)
```

**Request flow:**
```
Browser → Next.js :3000 → (rewrite /api/*) → NestJS :4000/api → Postgres
            │ proxy.ts: refreshes session before pages render
            └ Server Components call API with user's cookies (lib/api.ts)
```

Browser only talks to Next.js origin, so cookies are first-party (`SameSite=Lax`, httpOnly).

**Auth:** No public sign-up. Owner creates staff with `POST /api/users`. Roles: OWNER, STAFF, DESIGNER. Access token 15 min (`yb_at`), refresh token 14 days (`yb_rt`).

**Money/stock:** `numeric(14,2)` for money, `numeric(14,3)` for stock, `numeric(14,4)` for unit costs. Returns as strings. Format with `formatMoney()`, do arithmetic in SQL or integer centavos—never `parseFloat` sums.

## Conventions

- **API is ESM (NestJS 12).** Relative imports end in `.js` (`./customers.service.js`).
- **Validation lives in `packages/shared`.** One zod schema per input, used by the web form
  and by `ZodValidationPipe` in the controller. Rebuild shared (`npm run build -w @yamban/shared`)
  or keep `npm run dev` running so both apps see changes.
- **Enums come from `packages/shared/src/enums.ts`.** The pgEnums are built from them. Adding a
  value means editing that array, then `npm run db:generate`.
- **Inject the database** with `@InjectDb() private readonly db: Database`.
- **Auth is global.** New routes require a session by default. Use `@Public()` to open one and
  `@Roles(...)` to narrow one. Get the user with `@CurrentUser()`.
- **Stock never changes directly.** Write an `inventory_transactions` row; `materials.stock_on_hand`
  is a cache of that ledger. Deduct when the stage that uses a material starts, once per
  `order_materials` line (`consumed_at`).
- **Order snapshots.** Recipes, machine minutes and the electricity rate are copied onto the
  order at confirmation. Never read the live recipe for an existing order.
- **Next.js 16:** `params` and `searchParams` are Promises; `cookies()` is async; request
  interception lives in `src/proxy.ts` (not middleware.ts).

## UI rules that fail review

- Colours only through token utilities (`bg-primary`, `bg-partial`, `text-success`...). No raw
  Tailwind palette colours, no hex outside `globals.css`, no `dark:` colour overrides.
- Colour carries payment and stock meaning only. Four payment tiers: unpaid (outline), partial
  (tape yellow, states the balance), paid (green), overdue (red, states the age). Production
  stages stay neutral. Expenses are not red; only a negative net is.
- Every peso through `formatMoney()` / `<Money>`: `₱33,600.00`, true minus `−₱`. Never `$`, `PHP`, `P`.
  Never Barlow (`font-display`) on money: it has no ₱ glyph.
- Fabric in yards with the unit shown (`1.50 yd`), rolls as `26.00 of 78 yd`.
- Show balance before total, and largest, on any order view.
- Customer names display exactly as entered. No title-casing.
- Sentence case. Short, specific copy in the shop's words: collections, expenses, down payment, bale.
- Bordered surfaces, no shadows or gradient KPI cards. Magenta (`.yb-mark`) only in the logo,
  receipts and job tickets.
- Run `npm run check:ui`; it must end in `ALL PASS`.
