# Phase 3b: Simplified Design Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the design workflow to: upload final design file → mark ready for printing. No draft/revision/approval tracking.

**Architecture:** Each design job has one file slot (the final approved design). Designer uploads the file, then clicks "Ready for print" which marks the job COMPLETED and triggers the next stage. The existing `designJobs.approvalStatus` workflow is bypassed—we use `productionJobs.status` directly (PENDING → IN_PROGRESS → COMPLETED).

**Tech Stack:** NestJS 12 (ESM), Drizzle ORM, Multer for file uploads, Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui.

**Spec:** CLAUDE.md references "MVP specification v3". Simplified workflow per user request.

## Global Constraints

- ESM imports with `.js` extensions in API code (`./service.js`)
- UI tokens only—no raw Tailwind palette colours
- Sentence case copy
- `npm run build` must pass
- `npm run typecheck` must pass
- File uploads limited to 10MB per file
- Accepted file types: `.png`, `.jpg`, `.jpeg`, `.pdf`, `.psd`, `.ai`, `.cdr`

## Review Focus

1. **File overwrite:** Uploading new file should replace old one, not create duplicates
2. **Ready without file:** User clicks "Ready for print" but no file uploaded (block with clear message)
3. **Path traversal:** Malicious filename (sanitize, use UUID-based storage keys)
4. **Missing file on download:** Database row exists but file deleted from disk (handle gracefully)
5. **Double-click ready:** User clicks "Ready for print" twice (idempotent, no error)

---

## Task 1: Simplify Design Board to List View

**Files:**
- Modify: `apps/api/src/design/design.service.ts`
- Modify: `apps/api/src/design/design.controller.ts`
- Modify: `apps/web/src/app/(app)/production/design/page.tsx`
- Modify: `apps/web/src/app/(app)/production/design/design-board.tsx`

**Interfaces:**
- Consumes: `production_jobs` (DESIGN stage), `design_jobs`, `orders`, `customers`, `products`
- Produces:
  - `GET /design/board` returns flat list with `{ hasFile, isReady }` instead of approval columns
  - Simple list UI grouped by: "Needs design file" / "Ready for print"

- [ ] **Step 1: Update `listBoard()` in design.service.ts**

Change from approval status grouping to:
```typescript
interface DesignBoard {
  pending: DesignJobRow[];    // No file uploaded yet
  ready: DesignJobRow[];      // Has file, ready for printing
}
```

Add `hasFile` (check if design_files exists) and `isReady` (productionJobs.status === 'COMPLETED') to each row.

- [ ] **Step 2: Simplify design-board.tsx**

Two columns instead of four:
- "Needs design" - jobs without uploaded file
- "Ready for print" - jobs with file and marked ready

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/design/ apps/web/src/app/\(app\)/production/design/
git commit -m "refactor(design): simplify board to pending/ready view

Remove approval workflow columns. Show jobs by file upload status.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add File Upload Endpoint (Single File)

**Files:**
- Create: `apps/api/src/design/files.controller.ts`
- Create: `apps/api/src/design/files.service.ts`
- Modify: `apps/api/src/design/design.module.ts`
- Create: `apps/api/uploads/.gitkeep`

**Interfaces:**
- Consumes: `design_jobs`, `design_files` table
- Produces:
  - `POST /design/:id/file` uploads/replaces design file
  - `GET /design/:id/file` returns file metadata or 404
  - `GET /design/:id/file/download` streams file

- [ ] **Step 1: Create uploads directory**

```bash
mkdir -p apps/api/uploads
touch apps/api/uploads/.gitkeep
```

Add to `.gitignore`: `uploads/*` and `!uploads/.gitkeep`

- [ ] **Step 2: Install multer**

```bash
npm install multer @types/multer -w @yamban/api
```

- [ ] **Step 3: Create `files.service.ts`**

```typescript
// upload(designJobId, file):
//   - Delete existing file row + disk file if exists
//   - Insert new design_files row (version=1, isFinal=true)
//   - Return { id, fileName, uploadedAt }

// getFile(designJobId):
//   - Return file metadata or null

// deleteFile(designJobId):
//   - Remove file row and disk file
```

- [ ] **Step 4: Create `files.controller.ts`**

```typescript
@Controller('design/:id/file')
export class DesignFilesController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { ... }))
  upload(@Param('id') id: string, @UploadedFile() file) { ... }

  @Get()
  get(@Param('id') id: string) { ... }

  @Get('download')
  download(@Param('id') id: string, @Res() res) { ... }

  @Delete()
  delete(@Param('id') id: string) { ... }
}
```

- [ ] **Step 5: Register in design.module.ts**

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck -w @yamban/api`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/design/ apps/api/uploads apps/api/.gitignore
git commit -m "feat(api): add single-file upload for design jobs

POST /design/:id/file - upload or replace design file
GET /design/:id/file - get file metadata
DELETE /design/:id/file - remove file

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add "Ready for Print" Action

**Files:**
- Modify: `apps/api/src/design/design.service.ts`
- Modify: `apps/api/src/design/design.controller.ts`

**Interfaces:**
- Consumes: `production_jobs`, `design_files`
- Produces: `POST /design/:id/ready` marks design job complete (validates file exists)

- [ ] **Step 1: Add `markReady()` to design.service.ts**

```typescript
async markReady(designJobId: string) {
  // 1. Check file exists
  const file = await this.filesService.getFile(designJobId);
  if (!file) throw new BadRequestException('Upload a design file first.');

  // 2. Get production job for this design job
  // 3. Update production_jobs.status = 'COMPLETED', completedAt = now
  // 4. Start next stage (PRINTING) if exists
}
```

- [ ] **Step 2: Add endpoint to controller**

```typescript
@Post(':id/ready')
markReady(@Param('id') id: string) {
  return this.design.markReady(id);
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck -w @yamban/api`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/design/
git commit -m "feat(api): add ready-for-print action

POST /design/:id/ready marks job complete after file upload.
Validates file exists before allowing transition.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Simplify Design Job Detail Page

**Files:**
- Modify: `apps/web/src/app/(app)/production/design/[id]/page.tsx`
- Create: `apps/web/src/app/(app)/production/design/[id]/file-upload.tsx`
- Remove: `apps/web/src/app/(app)/production/design/[id]/status-actions.tsx` (replace with simpler version)

**Interfaces:**
- Consumes: `GET /design/:id`, `GET /design/:id/file`, `POST /design/:id/file`, `POST /design/:id/ready`
- Produces: Simplified detail page with file upload and "Ready for print" button

- [ ] **Step 1: Create `file-upload.tsx` client component**

- File input with drag-drop zone
- Shows current file if uploaded (filename, download link, delete button)
- Upload replaces existing file

- [ ] **Step 2: Replace status-actions.tsx with ready-action.tsx**

Simple component:
- If no file: disabled button "Upload file first"
- If has file but not ready: "Ready for print" button
- If ready: "✓ Ready for printing" badge

- [ ] **Step 3: Update page.tsx**

Remove approval workflow UI. Show:
- Order/customer/product info (keep)
- File upload section (new)
- Ready for print action (simplified)

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck -w @yamban/web`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/production/design/\[id\]/
git commit -m "feat(web): simplify design job page

Upload final design file, then mark ready for printing.
Removed draft/revision/approval workflow UI.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Clean Up Unused Approval Code

**Files:**
- Modify: `apps/api/src/design/design.service.ts` (remove approval transition logic)
- Modify: `packages/shared/src/schemas/design.ts` (simplify or remove)
- Modify: `packages/shared/src/enums.ts` (keep enums for backward compatibility)

**Interfaces:**
- Produces: Cleaner codebase without unused approval workflow

- [ ] **Step 1: Remove approval status update logic from design.service.ts**

The `update()` method no longer needs to handle `approvalStatus` transitions.
Keep basic field updates (requirements, referenceNotes) if still useful.

- [ ] **Step 2: Simplify design.ts schema**

Remove `updateDesignJobSchema` approval fields if no longer used.

- [ ] **Step 3: Run typecheck and tests**

Run: `npm run typecheck && npm run test`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/design/ packages/shared/src/
git commit -m "chore: remove unused approval workflow code

Simplified design process no longer uses approval status transitions.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## File Structure Summary

```
apps/api/src/design/
├── design.module.ts          # MODIFIED: add files controller/service
├── design.controller.ts      # MODIFIED: add /ready endpoint
├── design.service.ts         # MODIFIED: simplify board, add markReady
├── files.controller.ts       # NEW: single file upload/download
└── files.service.ts          # NEW: file operations

apps/api/uploads/
└── .gitkeep                  # NEW: upload directory

apps/web/src/app/(app)/production/design/
├── page.tsx                  # MODIFIED: simpler board view
├── design-board.tsx          # MODIFIED: two columns (pending/ready)
└── [id]/
    ├── page.tsx              # MODIFIED: simplified detail
    ├── file-upload.tsx       # NEW: upload component
    └── ready-action.tsx      # NEW: replaces status-actions.tsx
```

## New Simplified Flow

```
Order confirmed
      ↓
Design job created (PENDING)
      ↓
Designer works in Photoshop
(customer approves via message)
      ↓
Upload final design file ──→ File shows in system
      ↓
Click "Ready for print" ──→ Job moves to print queue
      ↓
PRINTING stage begins
```
