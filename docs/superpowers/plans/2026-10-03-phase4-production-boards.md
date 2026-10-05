# Phase 4: Production Boards & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build production stage boards (Print, Heat Press, Sewing), a dashboard with job counts per stage, stage transition actions, printable job tickets for heat press, and soft payment warnings.

**Architecture:** Each production stage gets a board view showing jobs in that stage. Jobs move through stages via "Mark complete" actions that update `production_jobs.status` and create the next stage's IN_PROGRESS status. The dashboard aggregates counts across all stages. Job tickets are printable HTML pages with customer/product/size info.

**Tech Stack:** NestJS 12 (ESM), Drizzle ORM, Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, `@react-to-print` for job tickets.

**Spec:** CLAUDE.md references "MVP specification v3". Production workflow: Design (COMPLETED) → Printing → Heat Press → Sewing → Ready.

## Global Constraints

- ESM imports with `.js` extensions in API code
- Validation schemas in `packages/shared/src/schemas/`
- UI tokens only—no raw Tailwind palette colours
- Production stages stay neutral (no colour)
- Sentence case copy, shop vocabulary
- `npm run build` must pass
- `npm run typecheck` must pass
- PACKAGING stage renamed to "Ready for pickup" in UI labels only

## Review Focus

1. **Design not ready but appears in print queue:** Only COMPLETED design jobs should show in print queue (filter by DESIGN stage `productionJobs.status = 'COMPLETED'`)
2. **Stage skipped:** User marks Heat Press complete but job was never in Printing (validate previous stage is COMPLETED)
3. **Payment warning bypassed silently:** Soft warning must appear before printing starts, user must acknowledge
4. **Job ticket missing sizes:** Products without size breakdown show empty (handle gracefully, show total quantity)
5. **Dashboard count mismatch:** Counts don't match board contents (both must query same source of truth)

---

## Task 1: Add Production Stage Board API Endpoints

**Files:**
- Create: `apps/api/src/production/production.service.ts`
- Create: `apps/api/src/production/production.controller.ts`
- Create: `apps/api/src/production/production.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `production_jobs`, `design_jobs`, `order_items`, `orders`, `customers`, `products`, `order_item_sizes`, `payments`
- Produces:
  - `GET /production/board/:stage` returns jobs for a stage with customer/product info
  - `GET /production/dashboard` returns `{ design: { forApproval: N, approved: N }, printing: N, heatPress: N, sewing: N, ready: N }`

- [ ] **Step 1: Create `apps/api/src/production/production.service.ts`**

```typescript
interface StageJobRow {
  id: string;                    // production_job.id
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;          // firstName + lastName
  productId: string;
  productName: string;
  quantity: number;
  status: JobStatus;
  dueDate: string | null;
  hasPaidDownPayment: boolean;   // for printing soft warning
  sizes: { size: string; quantity: number }[];  // from order_item_sizes
}

// listByStage(stage: ProductionStage): StageJobRow[]
// For PRINTING: only include jobs where DESIGN stage is COMPLETED
// For HEAT_PRESS/SEWING: include jobs where previous stage is COMPLETED

// getDashboardCounts(): DashboardCounts
// Count jobs per stage, split design by approval status
```

- [ ] **Step 2: Create `apps/api/src/production/production.controller.ts`**

```typescript
@Controller('production')
export class ProductionController {
  @Get('board/:stage')
  board(@Param('stage') stage: string) { ... }

  @Get('dashboard')
  dashboard() { ... }
}
```

- [ ] **Step 3: Create module and register in app.module.ts**

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck -w @yamban/api`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/production/ apps/api/src/app.module.ts
git commit -m "feat(api): add production board and dashboard endpoints

GET /production/board/:stage - jobs for a production stage
GET /production/dashboard - counts per stage for dashboard

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Stage Transition Endpoint

**Files:**
- Modify: `apps/api/src/production/production.service.ts`
- Modify: `apps/api/src/production/production.controller.ts`
- Create: `packages/shared/src/schemas/production.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `production_jobs` table
- Produces:
  - `PATCH /production/jobs/:id/complete` marks job COMPLETED, sets next stage to IN_PROGRESS
  - `PATCH /production/jobs/:id/start` marks job IN_PROGRESS

- [ ] **Step 1: Create validation schema in shared**

```typescript
// packages/shared/src/schemas/production.ts
export const startJobSchema = z.object({
  acknowledgeNoPayment: z.boolean().optional(), // for printing soft warning
});
```

- [ ] **Step 2: Add `startJob()` to service**

For PRINTING stage only:
- Check if order has any payments
- If no payments and `acknowledgeNoPayment !== true`, throw `BadRequestException` with `{ requiresAcknowledgement: true }`
- Set job status to IN_PROGRESS, set `startedAt`

- [ ] **Step 3: Add `completeJob()` to service**

In a transaction:
1. Set current job to COMPLETED, set `completedAt`
2. Find next stage job for same order item
3. If exists and previous stage now COMPLETED, set next stage to IN_PROGRESS

- [ ] **Step 4: Add endpoints to controller**

```typescript
@Patch('jobs/:id/start')
start(@Param('id') id: string, @Body(...) data) { ... }

@Patch('jobs/:id/complete')
complete(@Param('id') id: string) { ... }
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/production/ packages/shared/src/
git commit -m "feat(api): add job start and complete transitions

PATCH /production/jobs/:id/start - with payment acknowledgement for printing
PATCH /production/jobs/:id/complete - completes job, starts next stage

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Dashboard Page with Stage Counts

**Files:**
- Modify: `apps/web/src/app/(app)/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard-stats.tsx`

**Interfaces:**
- Consumes: `GET /production/dashboard`
- Produces: Dashboard showing counts: "5 for approval, 3 to print, 2 heat press, 1 sewing, 4 ready"

- [ ] **Step 1: Create `dashboard-stats.tsx` component**

Display cards/chips for each stage count:
- Design: For approval (N) | Approved (N)
- Printing (N)
- Heat press (N)
- Sewing (N)
- Ready for pickup (N)

Each links to the respective board.

- [ ] **Step 2: Update `page.tsx` to fetch dashboard data**

Replace placeholder content with real dashboard stats.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck -w @yamban/web`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/page.tsx apps/web/src/app/\(app\)/dashboard-stats.tsx
git commit -m "feat(web): add dashboard with production stage counts

Shows job counts per stage with links to boards.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create Print Queue Board

**Files:**
- Create: `apps/web/src/app/(app)/production/printing/page.tsx`
- Create: `apps/web/src/app/(app)/production/printing/print-board.tsx`
- Create: `apps/web/src/app/(app)/production/printing/job-card.tsx`
- Create: `apps/web/src/app/(app)/production/printing/start-job-dialog.tsx`

**Interfaces:**
- Consumes: `GET /production/board/PRINTING`, `PATCH /production/jobs/:id/start`, `PATCH /production/jobs/:id/complete`
- Produces: Board showing approved designs ready to print, with start/complete actions and payment warning

- [ ] **Step 1: Create page.tsx server component**

Fetches print queue from `/production/board/PRINTING`.

- [ ] **Step 2: Create job-card.tsx**

Display: Customer name, Product, Quantity, Due date, Payment status badge.

- [ ] **Step 3: Create start-job-dialog.tsx**

When clicking "Start printing":
- If `hasPaidDownPayment === false`, show confirmation modal:
  "No down payment recorded. Proceed anyway?"
  - "Cancel" / "Proceed without payment"
- On proceed, calls `PATCH /production/jobs/:id/start` with `acknowledgeNoPayment: true`

- [ ] **Step 4: Add "Mark complete" action**

Button that calls `PATCH /production/jobs/:id/complete`.

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck -w @yamban/web`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(app\)/production/printing/
git commit -m "feat(web): add print queue board with payment warning

Shows approved designs ready to print.
Soft warning if no down payment recorded.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create Heat Press Board with Printable Job Ticket

**Files:**
- Create: `apps/web/src/app/(app)/production/heat-press/page.tsx`
- Create: `apps/web/src/app/(app)/production/heat-press/heat-press-board.tsx`
- Create: `apps/web/src/app/(app)/production/heat-press/job-ticket.tsx`

**Interfaces:**
- Consumes: `GET /production/board/HEAT_PRESS`
- Produces: Board with jobs ready for heat press, printable job ticket per item

- [ ] **Step 1: Install react-to-print**

```bash
npm install react-to-print -w @yamban/web
```

- [ ] **Step 2: Create page.tsx and board component**

Similar structure to print queue, fetches from `/production/board/HEAT_PRESS`.

- [ ] **Step 3: Create job-ticket.tsx printable component**

```
┌─────────────────────────┐
│ [Customer Name]         │
│ [Product Name]          │
│ S:5  M:10  L:8  XL:2    │
│ Total: 25 pcs           │
│ Order: YMB-261003-001   │
└─────────────────────────┘
```

Hidden by default, revealed for printing via `react-to-print`.

- [ ] **Step 4: Add "Print ticket" and "Mark complete" buttons**

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck -w @yamban/web`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(app\)/production/heat-press/
git commit -m "feat(web): add heat press board with printable job ticket

Paper ticket shows: Customer, Product, Sizes, Order number.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Sewing Board

**Files:**
- Create: `apps/web/src/app/(app)/production/sewing/page.tsx`
- Create: `apps/web/src/app/(app)/production/sewing/sewing-board.tsx`

**Interfaces:**
- Consumes: `GET /production/board/SEWING`
- Produces: Simple board showing items in sewing stage

- [ ] **Step 1: Create page and board components**

Simpler than other boards—just tracking where items are.
Shows: Customer, Product, Quantity, "Mark complete" button.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck -w @yamban/web`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/production/sewing/
git commit -m "feat(web): add sewing board

Simple tracking board for sewing stage.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Labels and Navigation

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Modify: `apps/web/src/components/app-shell.tsx` (or navigation component)

**Interfaces:**
- Produces: Updated PACKAGING label, production nav links

- [ ] **Step 1: Update PRODUCTION_STAGE_LABELS**

```typescript
export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  DESIGN: 'Design',
  PRINTING: 'Printing',
  HEAT_PRESS: 'Heat press',
  SEWING: 'Sewing',
  PACKAGING: 'Ready for pickup',  // Changed from "Packaging"
};
```

- [ ] **Step 2: Add production nav links**

Add to sidebar/nav:
- Production (parent)
  - Design (existing)
  - Printing (new)
  - Heat press (new)
  - Sewing (new)

- [ ] **Step 3: Run typecheck and build**

Run: `npm run typecheck && npm run build -w @yamban/shared`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/enums.ts apps/web/src/components/
git commit -m "feat: update stage labels and add production nav

Rename PACKAGING to 'Ready for pickup'.
Add nav links to all production boards.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Final Integration and Testing

**Files:**
- All modified files

**Interfaces:**
- Consumes: Full application
- Produces: Passing build, typecheck

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Success

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: All pass

- [ ] **Step 4: Manual smoke test**

1. Create order, confirm it → production jobs created
2. Approve design → appears in print queue
3. Start printing (test payment warning if no payment)
4. Complete printing → appears in heat press queue
5. Print job ticket → verify format
6. Complete heat press → appears in sewing
7. Complete sewing → shows as ready
8. Check dashboard → counts are accurate

- [ ] **Step 5: Commit if any fixes needed**

```bash
git add .
git commit -m "chore: phase 4 integration fixes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## File Structure Summary

```
packages/shared/src/
├── enums.ts                      # MODIFIED: PACKAGING → Ready for pickup
└── schemas/
    └── production.ts             # NEW: startJobSchema

apps/api/src/
├── production/                   # NEW: entire module
│   ├── production.module.ts
│   ├── production.service.ts
│   └── production.controller.ts
└── app.module.ts                 # MODIFIED: register ProductionModule

apps/web/src/
├── app/(app)/
│   ├── page.tsx                  # MODIFIED: real dashboard
│   ├── dashboard-stats.tsx       # NEW
│   └── production/
│       ├── design/               # Existing
│       ├── printing/             # NEW
│       │   ├── page.tsx
│       │   ├── print-board.tsx
│       │   ├── job-card.tsx
│       │   └── start-job-dialog.tsx
│       ├── heat-press/           # NEW
│       │   ├── page.tsx
│       │   ├── heat-press-board.tsx
│       │   └── job-ticket.tsx
│       └── sewing/               # NEW
│           ├── page.tsx
│           └── sewing-board.tsx
└── components/
    └── app-shell.tsx             # MODIFIED: production nav
```
