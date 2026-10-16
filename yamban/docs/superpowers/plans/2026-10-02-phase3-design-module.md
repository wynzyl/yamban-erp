# Phase 3: Design Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Design production stage screens so designers can view their assigned jobs, manage approval workflows (DRAFTING → FOR_APPROVAL → REVISION_REQUESTED/APPROVED), and the system tracks design files per job.

**Architecture:** The design module adds a production board at `/production/design` with kanban-style columns for approval status. Each design job extends a production job one-to-one. When an order is confirmed (QUOTATION → CONFIRMED), the system creates production jobs for each order item including a DESIGN job. File uploads are deferred to a later phase (Phase 3b); this phase focuses on job status management.

**Tech Stack:** NestJS 12 (ESM), Drizzle ORM, Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui with Yamban tokens, Zod validation in `@yamban/shared`.

**Spec:** CLAUDE.md references "MVP specification v3" (external document). Database schema in `apps/api/src/db/schema/production.ts` defines `production_jobs`, `design_jobs`, and `design_files` tables.

## Global Constraints

- ESM imports with `.js` extensions in API code (`./service.js`)
- Validation schemas in `packages/shared/src/schemas/`, exported from `index.ts`
- Money as `numeric(14,2)` strings; quantities as `numeric(14,3)` strings
- UI tokens only—no raw Tailwind palette colours
- Run `npm run check:ui` before committing UI work
- Production stages stay neutral (no colour); only payment/stock states get colour
- Sentence case copy, shop vocabulary ("down payment" not "deposit")
- `npm run build` must pass (builds shared first)
- `npm run typecheck` must pass

## Review Focus

1. **Orphaned design jobs:** A design job without a parent production_job row (FK cascade should prevent, but verify on creation)
2. **Invalid approval transitions:** Attempting DRAFTING→APPROVED without going through FOR_APPROVAL (service should reject)
3. **Confirmation without job creation:** An order moves to CONFIRMED but production_jobs/design_jobs are never created (transaction rollback test)
4. **Designer role access:** DESIGNER role can view design board but STAFF cannot assign themselves to jobs owned by others (test role boundaries)
5. **Concurrent approval race:** Two users approve/request-revision simultaneously (optimistic concurrency via updatedAt or version check)

---

## Task 1: Create Design Zod Schemas in Shared Package

**Files:**
- Create: `packages/shared/src/schemas/design.ts`
- Modify: `packages/shared/src/index.ts` (add export)

**Interfaces:**
- Consumes: `DESIGN_APPROVAL_STATUSES`, `PRODUCTION_STAGES`, `JOB_STATUSES` from `enums.ts`
- Produces: `updateDesignJobSchema`, `assignDesignJobSchema`, `UpdateDesignJobData`, `AssignDesignJobData`, `DESIGN_APPROVAL_STATUS_LABELS`

- [ ] **Step 1: Write the failing import test**

Create a test file or verify the import fails:
```typescript
// packages/shared/src/schemas/design.test.ts
import { updateDesignJobSchema, DESIGN_APPROVAL_STATUS_LABELS } from './design.js';
import { describe, it, expect } from 'vitest';

describe('design schemas', () => {
  it('validates approval status transitions', () => {
    const result = updateDesignJobSchema.safeParse({ approvalStatus: 'FOR_APPROVAL' });
    expect(result.success).toBe(true);
  });

  it('has labels for all statuses', () => {
    expect(DESIGN_APPROVAL_STATUS_LABELS.DRAFTING).toBe('Drafting');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @yamban/shared -- --run design.test`
Expected: FAIL with "Cannot find module './design.js'"

- [ ] **Step 3: Implement `packages/shared/src/schemas/design.ts`**

```typescript
import { z } from 'zod';
import { DESIGN_APPROVAL_STATUSES, type DesignApprovalStatus } from '../enums.js';
import { optionalText } from './_helpers.js';

export const updateDesignJobSchema = z.object({
  approvalStatus: z.enum(DESIGN_APPROVAL_STATUSES).optional(),
  requirements: optionalText(2000),
  referenceNotes: optionalText(2000),
});
export type UpdateDesignJobData = z.output<typeof updateDesignJobSchema>;

export const assignDesignJobSchema = z.object({
  assignedToId: z.uuid().nullable(),
});
export type AssignDesignJobData = z.output<typeof assignDesignJobSchema>;

export const DESIGN_APPROVAL_STATUS_LABELS: Record<DesignApprovalStatus, string> = {
  DRAFTING: 'Drafting',
  FOR_APPROVAL: 'For approval',
  REVISION_REQUESTED: 'Revision requested',
  APPROVED: 'Approved',
};
```

- [ ] **Step 4: Add export to `packages/shared/src/index.ts`**

Add line: `export * from './schemas/design.js';`

- [ ] **Step 5: Run test to verify it passes**

Run: `npm run test -w @yamban/shared -- --run design.test`
Expected: PASS

- [ ] **Step 6: Run build to verify compilation**

Run: `npm run build -w @yamban/shared`
Expected: Success with no errors

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/schemas/design.ts packages/shared/src/schemas/design.test.ts packages/shared/src/index.ts
git commit -m "$(cat <<'EOF'
feat(shared): add design job schemas and labels

Phase 3 design module validation schemas for approval status updates
and job assignment.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create Production Jobs on Order Confirmation

**Files:**
- Modify: `apps/api/src/orders/orders.service.ts` (add job creation in `update` when status → CONFIRMED)
- Modify: `apps/api/src/db/schema/index.ts` (verify production exports)

**Interfaces:**
- Consumes: `orders`, `orderItems`, `productionJobs`, `designJobs` from schema; `PRODUCTION_STAGES` from shared
- Produces: Creates `production_jobs` rows for each order item (one per stage), plus `design_jobs` row for DESIGN stage

- [ ] **Step 1: Write the failing test**

```typescript
// apps/api/src/orders/orders.service.spec.ts (add to existing or create)
describe('order confirmation', () => {
  it('creates production jobs when order is confirmed', async () => {
    // Create order with items
    const order = await ordersService.create({ ... }, userId);
    // Confirm it
    await ordersService.update(order.id, { status: 'CONFIRMED' });
    // Verify production jobs exist
    const jobs = await db.select().from(productionJobs).where(eq(productionJobs.orderId, order.id));
    expect(jobs.length).toBeGreaterThan(0);
    const designJob = jobs.find(j => j.stage === 'DESIGN');
    expect(designJob).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @yamban/api -- orders.service.spec`
Expected: FAIL with "expected jobs.length to be greater than 0"

- [ ] **Step 3: Modify `orders.service.ts` to create production jobs on confirmation**

In the `update` method, after setting `status: 'CONFIRMED'` and `confirmedAt`, add transaction logic to:
1. Fetch all `orderItems` for the order
2. For each item and each `PRODUCTION_STAGES`, insert a `production_jobs` row with `sequence` (1 for DESIGN, 2 for PRINTING, etc.)
3. For DESIGN stage jobs, also insert a `design_jobs` row linked to the production job

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -w @yamban/api -- orders.service.spec`
Expected: PASS

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/orders/orders.service.ts
git commit -m "$(cat <<'EOF'
feat(api): create production jobs on order confirmation

When an order transitions to CONFIRMED, the system now creates
production_jobs rows for each order item across all stages, plus
design_jobs rows for the DESIGN stage.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Create Design Jobs API Module

**Files:**
- Create: `apps/api/src/design/design.service.ts`
- Create: `apps/api/src/design/design.controller.ts`
- Create: `apps/api/src/design/design.module.ts`
- Modify: `apps/api/src/app.module.ts` (register DesignModule)

**Interfaces:**
- Consumes: `productionJobs`, `designJobs`, `orders`, `orderItems`, `products`, `customers` from schema
- Produces:
  - `DesignService.listBoard(): DesignJobRow[]` — all design jobs grouped by approval status
  - `DesignService.get(id: string): DesignJobDetail`
  - `DesignService.update(id: string, data: UpdateDesignJobData): DesignJob`
  - `DesignService.assign(id: string, data: AssignDesignJobData, userId: string): DesignJob`

- [ ] **Step 1: Write the failing test for DesignService.listBoard**

```typescript
// apps/api/src/design/design.service.spec.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { DesignService } from './design.service.js';

describe('DesignService', () => {
  it('listBoard returns jobs grouped by approval status', async () => {
    const service = new DesignService(db);
    const result = await service.listBoard();
    expect(result).toHaveProperty('DRAFTING');
    expect(result).toHaveProperty('FOR_APPROVAL');
    expect(result).toHaveProperty('REVISION_REQUESTED');
    expect(result).toHaveProperty('APPROVED');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @yamban/api -- design.service`
Expected: FAIL with "Cannot find module './design.service.js'"

- [ ] **Step 3: Implement `apps/api/src/design/design.service.ts`**

Service with:
- `listBoard()`: Query design_jobs joined with production_jobs, order_items, orders, products, customers. Group by approvalStatus.
- `get(id)`: Single design job with full context (order info, item info, requirements, notes)
- `update(id, data)`: Validate approval status transitions, update design_jobs
- `assign(id, data, userId)`: Update production_jobs.assignedToId

- [ ] **Step 4: Implement `apps/api/src/design/design.controller.ts`**

```typescript
@Controller('design')
export class DesignController {
  @Get('board')
  board() { return this.service.listBoard(); }

  @Get(':id')
  get(@Param('id') id: string) { return this.service.get(id); }

  @Patch(':id')
  update(@Param('id') id, @Body(...) data) { return this.service.update(id, data); }

  @Patch(':id/assign')
  assign(@Param('id') id, @Body(...) data, @CurrentUser('id') userId) { ... }
}
```

- [ ] **Step 5: Implement `apps/api/src/design/design.module.ts`**

Standard NestJS module exporting DesignService.

- [ ] **Step 6: Register in `apps/api/src/app.module.ts`**

Add `DesignModule` to imports.

- [ ] **Step 7: Run tests**

Run: `npm run test -w @yamban/api -- design`
Expected: PASS

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/design/
git add apps/api/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat(api): add design module with board and job management

GET /design/board - list jobs grouped by approval status
GET /design/:id - job details
PATCH /design/:id - update approval status, requirements, notes
PATCH /design/:id/assign - assign designer to job

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create Design Board Page (Web)

**Files:**
- Create: `apps/web/src/app/(app)/production/design/page.tsx`
- Create: `apps/web/src/app/(app)/production/design/design-board.tsx` (client component)
- Create: `apps/web/src/app/(app)/production/design/job-card.tsx`

**Interfaces:**
- Consumes: `GET /design/board` API endpoint; `DESIGN_APPROVAL_STATUS_LABELS` from shared
- Produces: Kanban board UI with 4 columns (Drafting, For approval, Revision requested, Approved), each showing job cards

- [ ] **Step 1: Create the page structure**

Server component that fetches `/design/board` and passes to client component.

- [ ] **Step 2: Implement `design-board.tsx` client component**

Kanban layout with 4 columns. Use Yamban tokens:
- Column headers in neutral text
- Current/active state in `text-primary`
- Cards as bordered surfaces (no shadows)

- [ ] **Step 3: Implement `job-card.tsx`**

Display:
- Order number (link to order)
- Customer name
- Product name
- Item quantity
- Due date if present
- Assigned designer avatar/name or "Unassigned"

- [ ] **Step 4: Run check:ui**

Run: `npm run check:ui`
Expected: ALL PASS

- [ ] **Step 5: Run dev and verify visually**

Run: `npm run dev`
Navigate to `/production/design`
Verify: Board renders with 4 columns, correct Yamban styling

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(app\)/production/design/
git commit -m "$(cat <<'EOF'
feat(web): add design board page with kanban layout

Four-column board showing design jobs by approval status.
Cards display order, customer, product, and assignment info.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create Design Job Detail Page

**Files:**
- Create: `apps/web/src/app/(app)/production/design/[id]/page.tsx`
- Create: `apps/web/src/app/(app)/production/design/[id]/status-actions.tsx` (client component for status transitions)
- Create: `apps/web/src/app/(app)/production/design/[id]/assign-dialog.tsx`

**Interfaces:**
- Consumes: `GET /design/:id`, `PATCH /design/:id`, `PATCH /design/:id/assign`
- Produces: Detail view with order context, approval workflow actions, assignment UI

- [ ] **Step 1: Create the detail page server component**

Fetch job details, show:
- Breadcrumb back to board
- Order number and customer
- Product and item details
- Requirements and reference notes (editable)
- Current approval status
- Assigned designer

- [ ] **Step 2: Implement `status-actions.tsx`**

Buttons for valid transitions:
- DRAFTING → "Submit for approval" (→ FOR_APPROVAL)
- FOR_APPROVAL → "Approve" (→ APPROVED) or "Request revision" (→ REVISION_REQUESTED)
- REVISION_REQUESTED → "Submit for approval" (→ FOR_APPROVAL)
- APPROVED → no actions (terminal)

- [ ] **Step 3: Implement `assign-dialog.tsx`**

Dialog to select designer from users with DESIGNER role. Call `PATCH /design/:id/assign`.

- [ ] **Step 4: Run check:ui**

Run: `npm run check:ui`
Expected: ALL PASS

- [ ] **Step 5: Run dev and test workflow**

Navigate to a design job, test status transitions, verify state updates.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(app\)/production/design/\[id\]/
git commit -m "$(cat <<'EOF'
feat(web): add design job detail page with workflow actions

View job details, update requirements/notes, submit for approval,
approve or request revisions, and assign designers.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add Design Link to Order Detail Page

**Files:**
- Modify: `apps/web/src/app/(app)/orders/[id]/page.tsx`
- Modify: `apps/api/src/orders/orders.service.ts` (add production jobs to order detail response)

**Interfaces:**
- Consumes: `production_jobs` and `design_jobs` tables joined to order detail
- Produces: Production status section on order detail showing job statuses with links to design jobs

- [ ] **Step 1: Modify orders service to include production jobs**

In `get()` method, also fetch `production_jobs` for the order, including `design_jobs` for DESIGN stage.

- [ ] **Step 2: Update OrderDetail type in page.tsx**

Add `productionJobs` array with stage, status, and designJobId.

- [ ] **Step 3: Add Production section to order detail page**

After Items and Payments sections, show Production progress:
- Table or card layout showing each item's production stages
- DESIGN stage links to `/production/design/:designJobId`
- Other stages show status as neutral text

- [ ] **Step 4: Run check:ui**

Run: `npm run check:ui`
Expected: ALL PASS

- [ ] **Step 5: Run dev and verify**

View an order that has been confirmed, verify production section appears with design job links.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/orders/orders.service.ts
git add apps/web/src/app/\(app\)/orders/\[id\]/page.tsx
git commit -m "$(cat <<'EOF'
feat: show production progress on order detail page

Confirmed orders now display production job status for each item.
Design stage jobs link to the design board for workflow management.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add Approval Status Validation in Design Service

**Files:**
- Modify: `apps/api/src/design/design.service.ts`
- Create: `apps/api/src/design/design.service.spec.ts` (if not exists, extend)

**Interfaces:**
- Consumes: Current `approvalStatus` from database
- Produces: `BadRequestException` for invalid transitions

- [ ] **Step 1: Write failing tests for invalid transitions**

```typescript
it('rejects DRAFTING → APPROVED transition', async () => {
  // Create job in DRAFTING state
  await expect(service.update(jobId, { approvalStatus: 'APPROVED' }))
    .rejects.toThrow('Cannot transition from DRAFTING to APPROVED');
});

it('allows DRAFTING → FOR_APPROVAL transition', async () => {
  const result = await service.update(jobId, { approvalStatus: 'FOR_APPROVAL' });
  expect(result.approvalStatus).toBe('FOR_APPROVAL');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -w @yamban/api -- design.service`
Expected: FAIL (currently allows any transition)

- [ ] **Step 3: Implement transition validation**

Valid transitions:
- DRAFTING → FOR_APPROVAL
- FOR_APPROVAL → APPROVED | REVISION_REQUESTED
- REVISION_REQUESTED → FOR_APPROVAL
- APPROVED → (none, terminal)

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -w @yamban/api -- design.service`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/design/design.service.ts apps/api/src/design/design.service.spec.ts
git commit -m "$(cat <<'EOF'
feat(api): enforce approval status transition rules

DRAFTING → FOR_APPROVAL → APPROVED or REVISION_REQUESTED
REVISION_REQUESTED → FOR_APPROVAL (cycle back)
APPROVED is terminal.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Add Users List Endpoint for Designer Selection

**Files:**
- Modify: `apps/api/src/users/users.controller.ts`
- Modify: `apps/api/src/users/users.service.ts`

**Interfaces:**
- Consumes: `users` table filtered by role
- Produces: `GET /users?role=DESIGNER` returns list of users for assignment dropdown

- [ ] **Step 1: Check if users list already supports role filter**

Read current implementation.

- [ ] **Step 2: Add role filter if missing**

Modify `list()` to accept optional `role` query param.

- [ ] **Step 3: Test endpoint**

Run: `curl http://localhost:4000/api/users?role=DESIGNER`
Expected: JSON array of users with DESIGNER role

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/users/
git commit -m "$(cat <<'EOF'
feat(api): add role filter to users list endpoint

GET /users?role=DESIGNER returns only designers for job assignment.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Final Integration Test and Typecheck

**Files:**
- All modified files

**Interfaces:**
- Consumes: Full application
- Produces: Passing build, typecheck, and tests

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Success

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npm run test`
Expected: All pass

- [ ] **Step 4: Run check:ui**

Run: `npm run check:ui`
Expected: ALL PASS

- [ ] **Step 5: Manual smoke test**

1. Create new order with items
2. Confirm order → verify production jobs created
3. Navigate to /production/design → see board with job in DRAFTING
4. Open job detail → assign designer
5. Submit for approval → see job move to FOR approval column
6. Approve job → see job in APPROVED column
7. Return to order detail → see production status shows DESIGN as complete

- [ ] **Step 6: Final commit if any cleanup needed**

```bash
git add .
git commit -m "$(cat <<'EOF'
chore: phase 3 design module cleanup and integration fixes

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## File Structure Summary

```
packages/shared/src/
├── schemas/
│   └── design.ts              # NEW: design job schemas

apps/api/src/
├── design/                    # NEW: entire module
│   ├── design.module.ts
│   ├── design.service.ts
│   ├── design.service.spec.ts
│   └── design.controller.ts
├── orders/
│   └── orders.service.ts      # MODIFIED: create jobs on confirm
└── app.module.ts              # MODIFIED: register DesignModule

apps/web/src/app/(app)/
├── production/
│   └── design/                # NEW: entire route
│       ├── page.tsx           # Board view
│       ├── design-board.tsx   # Client component
│       ├── job-card.tsx
│       └── [id]/
│           ├── page.tsx       # Detail view
│           ├── status-actions.tsx
│           └── assign-dialog.tsx
└── orders/
    └── [id]/
        └── page.tsx           # MODIFIED: add production section
```
