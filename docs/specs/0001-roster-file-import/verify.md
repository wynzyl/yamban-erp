# Verify: Roster file import · spec 0001 · updated 2026-10-16

_Steps derived from spec 0001 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual

- [x] Click "Import from file" button on roster form → file picker opens → AC-1 ✓ 2026-10-16
- [x] Select an Excel file (.xlsx) → preview dialog appears with parsed rows → AC-2, AC-4 ✓ 2026-10-16
- [x] Select a CSV file (.csv) → preview dialog appears with parsed rows → AC-2 ✓ 2026-10-16
- [ ] Select an .xls file → preview dialog appears with parsed rows → AC-2
- [x] Upload file with columns Name, Number, Size → data maps to correct fields → AC-3 ✓ 2026-10-16
- [x] Upload file with size "extra small" → parses as XS → AC-5 ✓ 2026-10-16
- [x] Upload file with size "MEDIUM" → parses as M (case insensitive) → AC-5 ✓ 2026-10-16
- [x] Upload file with size "xl" → parses as XL (abbreviation) → AC-5 ✓ 2026-10-16
- [x] Upload file with invalid size "XXXL" → row highlighted as invalid in preview → AC-4 ✓ 2026-10-16
- [x] Upload file with blank name field → row included, name shows (blank) → AC-6 ✓ 2026-10-16
- [x] Upload file with blank jersey number → row included, number shows (blank) → AC-6 ✓ 2026-10-16
- [ ] Upload file with blank row → row not included in preview → AC-6
- [ ] Upload file with only 1 column (name) → default size assigned → AC-7
- [x] Upload file with only 2 columns (name, number) → default size assigned → AC-7 ✓ 2026-10-16
- [x] Upload file with 5 columns → only first 3 used, extras ignored → AC-8 ✓ 2026-10-16
- [x] Upload file with 3 sheets → only first sheet data appears → AC-9 ✓ 2026-10-16 (tested with 2 sheets)
- [x] Click Confirm on preview → roster replaced with imported data → AC-10 ✓ 2026-10-16
- [x] Click Cancel on preview → dialog closes, roster unchanged → AC-11 ✓ 2026-10-16

## Value sourcing coverage

- [ ] Vary file format (xlsx, csv, xls) → same parsing result for same data
- [ ] Upload file with 20 rows → preview shows all 20 rows
- [ ] Upload file with mixed valid/invalid sizes → only invalid rows highlighted
- [ ] Change available sizes on order item → default size changes for missing size column

## Acceptance criteria coverage

- AC-1 … covered by steps 1
- AC-2 … covered by steps 2, 3, 4
- AC-3 … covered by step 5
- AC-4 … covered by steps 2, 9
- AC-5 … covered by steps 6, 7, 8
- AC-6 … covered by steps 10, 11, 12
- AC-7 … covered by steps 13, 14
- AC-8 … covered by step 15
- AC-9 … covered by step 16
- AC-10 … covered by step 17
- AC-11 … covered by step 18
