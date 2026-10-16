# 0001. Roster file import

**Date**: 2026-10-16
**Status**: Accepted

## Summary

The roster form gets a file import feature that lets you upload an Excel, CSV, or other spreadsheet file to populate the roster. After selecting a file, a preview shows the parsed rows with any invalid sizes highlighted. Confirming the import replaces the current roster with the imported data. This saves time when entering large rosters since you can prepare the data in a spreadsheet and import it directly.

## Requirements

**User stories**:
- As a shop staff member, I want to import a roster from my Excel file so that I do not have to type each player name one by one.

**Acceptance criteria** (the contract):
- **AC-1**: Roster form has an "Import from file" button that opens a file picker.
- **AC-2**: File picker accepts Excel (.xlsx, .xls), CSV (.csv), and other common spreadsheet formats.
- **AC-3**: The first three columns of the first sheet are read as Name, Number, Size (fixed column order).
- **AC-4**: After file selection, a preview dialog shows the parsed rows with invalid sizes highlighted.
- **AC-5**: Size parsing accepts both abbreviations (XS, S, M, L, XL, 2XL, 3XL) and full labels (Extra Small, Small, Medium, Large), case insensitive.
- **AC-6**: Blank names and jersey numbers are allowed (partial data is valid). Blank rows are ignored.
- **AC-7**: Fewer than 3 columns per row is treated as partial data (name only uses default size; name plus number uses default size).
- **AC-8**: Extra columns beyond the first 3 are ignored silently.
- **AC-9**: Files with multiple sheets use the first sheet only.
- **AC-10**: Confirming the import replaces the current roster entirely with the imported data.
- **AC-11**: User can cancel the import from the preview dialog, leaving the roster unchanged.

## Decision

**Chosen option**: Option 1: File upload with preview dialog

A client side file import with SheetJS (xlsx) library to parse spreadsheet files. Preview dialog shows the parsed data before committing.

**Implementation skills**: `yamban-design-system` (`anthropics/superpowers`, `.claude/skills/yamban-design-system/`)

## Feature design

**Data model sketch**:
No changes. The existing `RosterEntry` interface (`playerName: string`, `jerseyNumber: string | null`, `size: GarmentSize`) and the `updateRosterSchema` in `@yamban/shared` remain as is. The API endpoint is unchanged.

**API surface**:
No changes. The existing `PUT /api/orders/{orderId}/items/{itemId}/roster` endpoint accepts `{ roster: [{ playerName, jerseyNumber?, size }] }` and remains the same. File parsing is client side only.

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Parse uploaded file | Array of raw row arrays | SheetJS library parsing the file ArrayBuffer |
| Convert rows to roster entries | Array of roster entries with validity flag | Client side mapping of columns to fields |
| Default size when column is missing | First available size from `item.sizes` | Existing logic in `addEntry()` already does this |
| Size validation | Boolean per row | Match against `GARMENT_SIZES` array plus `SIZE_LABELS` values |

**Key invariants**:
- File is parsed entirely client side, never uploaded to server
- Preview shows exact data that will be imported
- Import replaces roster entirely (no append mode)
- Size must be a valid `GarmentSize` enum value before import is allowed

**Security model**:
No changes. The existing `canEditRoster` permission check already gates access to the page. File parsing is client side so no server security concerns.

**Configuration required**:
- Add `xlsx` (SheetJS) package to dependencies

**Critical test scenarios**:
- Happy path: upload Excel file with 10 rows, see preview, confirm, roster now has 10 rows, verifies **AC-1**, **AC-2**, **AC-4**, **AC-10**
- Multiple formats: upload .xlsx, .csv, .xls files, all parse correctly, verifies **AC-2**
- Partial data: upload file with only name column, see default size assigned, verifies **AC-7**
- Invalid size: upload file with typo in size column, see error highlight in preview, verifies **AC-4**, **AC-5**
- Cancel import: upload file, see preview, click cancel, roster unchanged, verifies **AC-11**
- Multi sheet file: upload file with 3 sheets, only first sheet data appears, verifies **AC-9**

## Build plan

1. [x] Add `xlsx` (SheetJS) package to `apps/web` dependencies, satisfies **AC-2**
2. [x] Create `parseSpreadsheetFile(file: File): Promise<string[][]>` utility that reads any spreadsheet format and returns rows as string arrays (first sheet only), satisfies **AC-2**, **AC-9**
3. [x] Create `mapRowsToRoster(rows: string[][], defaultSize: GarmentSize)` utility that converts row arrays to roster entries with validity flags, satisfies **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
4. [x] Create `RosterImportPreview` component that shows parsed rows in a table with invalid sizes highlighted, satisfies **AC-4**
5. [x] Add "Import from file" button and hidden file input to `roster-form.tsx`, satisfies **AC-1**
6. [x] Wire file selection to parse the file and show the preview dialog, satisfies **AC-1**, **AC-4**
7. [x] Add confirm/cancel actions to preview dialog that either replace roster or close dialog, satisfies **AC-10**, **AC-11**

## Consequences

**Positive**:
- Large rosters can be imported directly from spreadsheets
- Works with existing customer workflows (many already have rosters in Excel)
- No server changes needed

**Negative / tradeoffs**:
- Adds SheetJS library to bundle (approximately 200KB minified, can be code split)
- Fixed column order means users must prepare files in the right format

**Neutral**:
- No API or schema changes needed
- No migration required
