# Rationale: Roster file import

## Context

The current roster form at `apps/web/src/app/(app)/orders/[id]/items/[itemId]/roster/roster-form.tsx` lets users add players one at a time. Each row has three fields: player name, jersey number, and size. For large teams (20+ players), this is tedious.

Many customers already have their roster in a spreadsheet. They want to import the file directly rather than typing each player individually or copy/pasting.

The roster data model and API already exist and need no changes. This is a frontend only enhancement to the form's input method.

## Options considered

### Option 1: File upload with preview dialog

Add an "Import from file" button. When a file is selected, parse it client side and show a preview dialog with the imported rows. User confirms or cancels. Confirming replaces the roster.

**Pros**:
- No server round trip needed (client side parsing)
- Preview lets user verify before committing
- Clear replace semantics

**Cons**:
- Need to add a spreadsheet parsing library (adds bundle size)

### Option 2: Server side file processing

Upload the file to the server, parse it there, return the roster data.

**Pros**:
- No client side library needed
- Could support more formats

**Cons**:
- Requires new API endpoint
- Slower (network round trip)
- More complex error handling

### Option 3: Copy/paste from spreadsheet

A textarea where you paste tab separated content from a spreadsheet.

**Pros**:
- No file picker needed
- No parsing library needed

**Cons**:
- Less intuitive than file import
- Users must know to copy/paste (not everyone does)

## Why Option 1

Client side parsing with SheetJS is the simplest approach. The library is mature, handles all common spreadsheet formats (.xlsx, .xls, .csv, .ods), and runs entirely in the browser. No server changes needed.

The preview dialog is important because roster data can have errors (wrong size spelling, wrong columns). Showing the parsed data before replacing lets users catch mistakes.

Fixed column order (Name, Number, Size) avoids the complexity of header detection or column mapping UI. Users can prepare their spreadsheet to match, and the format is simple to explain.
