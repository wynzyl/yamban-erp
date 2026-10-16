# Yamban Shop System

Orders, inventory, collections and expenses for a sublimation and tailoring shop.
Monorepo: NestJS API, Next.js web app, PostgreSQL, one shared package.

```
apps/api          NestJS 12 (ESM) · Drizzle ORM · PostgreSQL · cookie-based JWT auth
apps/web          Next.js 16 (App Router) · Tailwind CSS v4 · shadcn/ui on Yamban tokens
packages/shared   Enums, zod schemas and formatters used by both apps
```

## Requirements

Node 22.12+, pnpm 12 (`corepack enable`), Docker (for Postgres) or a local PostgreSQL 16+.

## First run

```bash
pnpm install
cp .env.example .env          # then set JWT_ACCESS_SECRET and SEED_OWNER_PASSWORD
pnpm db:up                    # Postgres 17 in Docker on :5432
pnpm build                    # builds packages/shared first (both apps import its dist)
pnpm db:migrate               # applies apps/api/drizzle/*.sql
pnpm db:seed                  # creates the owner account + example machines and kWh rate
pnpm dev                      # web on :3000, API on :4000
```

Open http://localhost:3000 and sign in with `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`.

## How requests flow

```
Browser ──► Next.js :3000 ──(rewrite /api/*)──► NestJS :4000/api ──► Postgres
              │ proxy.ts: refreshes the session before pages render
              └ Server Components call the API directly with the user's cookies (lib/api.ts)
```

The browser only talks to the Next.js origin, so auth cookies are first-party
(`SameSite=Lax`, httpOnly) and there is no CORS in normal use.

## Auth

- No public sign-up. The seed creates the OWNER; the owner adds staff with `POST /api/users`.
- Roles: `OWNER` (everything), `STAFF`, `DESIGNER`. Every route needs a session unless marked
  `@Public()`; restrict further with `@Roles('STAFF')`.
- Access token: JWT, 15 min, cookie `yb_at`. Refresh token: opaque, 14 days, cookie `yb_rt`,
  stored as a SHA-256 hash in `sessions`.
- Refresh rotates the token. A rotated token shown again within 15 s is treated as a race
  (two tabs) and allowed; outside that window, or after logout, the whole session family is revoked.
- Login is rate-limited to 5 attempts per minute per IP.

| Endpoint | Access |
| --- | --- |
| `POST /api/auth/login` · `POST /api/auth/refresh` · `POST /api/auth/logout` | public |
| `GET /api/auth/me` | signed in |
| `GET/POST /api/users` | OWNER |
| `GET/POST /api/customers` · `GET/PATCH /api/customers/:id` | signed in |
| `GET /api/health` | public |

## Database

The schema in `apps/api/src/db/schema/` covers the whole MVP spec v3: master data, orders and
size runs, roster, order material snapshots (reservations), production and design jobs,
purchase requests, the inventory ledger, electricity costing and expenses.

```bash
# after editing a schema file
pnpm db:generate --name add_something
pnpm db:migrate
pnpm db:studio     # browse data
```

Money is `numeric(14,2)`, stock quantities `numeric(14,3)`, unit costs `numeric(14,4)`.
They come back as strings: format with `formatMoney()` and do arithmetic in SQL or with
integer centavos, never with `parseFloat` sums.

## Adding a module (the customers module is the template)

1. Zod schema in `packages/shared/src/schemas/`, exported from `index.ts`.
2. `apps/api/src/<name>/` with service, controller (`ZodValidationPipe(schema)`) and module;
   register it in `app.module.ts`.
3. `apps/web/src/app/(app)/<route>/page.tsx`. A real route folder replaces the
   "planned for phase N" placeholder automatically.

## UI rules (guideline v0.1)

Tokens live only in `apps/web/src/app/globals.css`. Run before committing UI work:

```bash
pnpm check:ui     # palette drift, stray hex, magenta outside the logo, wrong currency, contrast gate
```

## Scripts

| | |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm typecheck` / `pnpm test` | all workspaces via Turborepo |
| `pnpm db:up` / `db:down` | Postgres container |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:studio` | Drizzle |
| `pnpm check:ui` | guideline checks for the web app |
