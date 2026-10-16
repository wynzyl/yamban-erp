import { GARMENT_SIZES, SIZE_LABELS, type GarmentSize } from '@yamban/shared';

/**
 * A roster entry parsed from a spreadsheet, with validity flags for sizes.
 */
export interface ParsedRosterEntry {
  playerName: string;
  jerseyNumber: string;
  size: GarmentSize;
  sizeValid: boolean;
  shortSize: GarmentSize | null;
  shortSizeValid: boolean;
}

/**
 * Build a lookup map for size parsing.
 * Accepts both abbreviations (XS, S, M, L, XL, 2XL, 3XL) and full labels
 * (Extra Small, Small, Medium, Large, Extra Large, etc.), case insensitive.
 */
function buildSizeLookup(): Map<string, GarmentSize> {
  const lookup = new Map<string, GarmentSize>();

  // Add exact abbreviations (case insensitive)
  for (const size of GARMENT_SIZES) {
    lookup.set(size.toLowerCase(), size);
  }

  // Add full label names (case insensitive)
  for (const [size, label] of Object.entries(SIZE_LABELS)) {
    lookup.set(label.toLowerCase(), size as GarmentSize);
  }

  // Add common full names that may not be in SIZE_LABELS
  const fullNames: Record<string, GarmentSize> = {
    'extra small': 'XS',
    'extra-small': 'XS',
    small: 'S',
    medium: 'M',
    large: 'L',
    'extra large': 'XL',
    'extra-large': 'XL',
    'double extra large': '2XL',
    'double extra-large': '2XL',
    'triple extra large': '3XL',
    'triple extra-large': '3XL',
    'quadruple extra large': '4XL',
    'quadruple extra-large': '4XL',
    'quintuple extra large': '5XL',
    'quintuple extra-large': '5XL',
    'one size': 'ONE_SIZE',
    onesize: 'ONE_SIZE',
  };

  for (const [name, size] of Object.entries(fullNames)) {
    lookup.set(name.toLowerCase(), size);
  }

  return lookup;
}

const SIZE_LOOKUP = buildSizeLookup();

/**
 * Parse a size string into a GarmentSize.
 * Returns the parsed size and whether it was valid.
 */
function parseSize(
  input: string,
  defaultSize: GarmentSize,
): { size: GarmentSize; valid: boolean } {
  const normalized = input.trim().toLowerCase();

  if (normalized === '') {
    // Blank size uses default (AC-7)
    return { size: defaultSize, valid: true };
  }

  const matched = SIZE_LOOKUP.get(normalized);
  if (matched) {
    return { size: matched, valid: true };
  }

  // Invalid size: use default but mark as invalid
  return { size: defaultSize, valid: false };
}

/**
 * Check if a row is a header row (case insensitive match for Name, Number, Size, and optionally Short Size).
 */
function isHeaderRow(row: string[]): boolean {
  if (row.length < 3) return false;
  const name = row[0]?.trim().toLowerCase();
  const number = row[1]?.trim().toLowerCase();
  const size = row[2]?.trim().toLowerCase();
  // Column 4 (short size) is optional in header detection
  return name === 'name' && number === 'number' && size === 'size';
}

/**
 * Maps spreadsheet rows to roster entries with validity flags.
 *
 * Column order is fixed (AC-3): Name, Number, Size, Short Size (optional)
 * - First row is ignored when exactly Name/Number/Size (header row, AC-3)
 * - Blank names and jersey numbers are allowed (AC-6)
 * - Fewer than 3 columns uses default size (AC-7)
 * - Extra columns beyond 4 are ignored (AC-8)
 * - Size parsing accepts abbreviations and full labels, case insensitive (AC-5)
 * - Short size is optional; blank short size remains null
 *
 * @param rows Array of row arrays (each row is string[])
 * @param defaultSize The default size to use when size column is missing or blank
 * @returns Array of parsed roster entries with validity flags
 */
export function mapRowsToRoster(
  rows: string[][],
  defaultSize: GarmentSize,
): ParsedRosterEntry[] {
  const entries: ParsedRosterEntry[] = [];

  // Skip header row if present (AC-3)
  const firstRow = rows[0];
  const dataRows =
    firstRow && isHeaderRow(firstRow) ? rows.slice(1) : rows;

  for (const row of dataRows) {
    // Column 0: Name, Column 1: Number, Column 2: Size, Column 3: Short Size (optional)
    const playerName = row[0] ?? '';
    const jerseyNumber = row[1] ?? '';
    const sizeInput = row[2] ?? '';
    const shortSizeInput = row[3] ?? '';

    // Skip rows where name is blank (we need at least a name)
    // But blank names ARE allowed per AC-6, so include all rows
    // Actually, re-reading AC-6: "Blank names and jersey numbers are allowed (partial data is valid)"
    // This means rows with blank names ARE valid and should be included
    // But a completely empty row (no name, no number, no size) should be skipped
    // That filtering already happens in parseSpreadsheetFile

    const { size, valid } = parseSize(sizeInput, defaultSize);

    // Parse short size: blank means null (no short), otherwise parse it
    let shortSize: GarmentSize | null = null;
    let shortSizeValid = true;
    if (shortSizeInput.trim() !== '') {
      const parsed = parseSize(shortSizeInput, defaultSize);
      shortSize = parsed.size;
      shortSizeValid = parsed.valid;
    }

    entries.push({
      playerName,
      jerseyNumber,
      size,
      sizeValid: valid,
      shortSize,
      shortSizeValid,
    });
  }

  return entries;
}

/**
 * Check if all entries have valid sizes (both shirt and short sizes).
 */
export function allSizesValid(entries: ParsedRosterEntry[]): boolean {
  return entries.every((entry) => entry.sizeValid && entry.shortSizeValid);
}

/**
 * Convert parsed entries to the format expected by the roster form.
 */
export function toEditableRoster(
  entries: ParsedRosterEntry[],
): Array<{ playerName: string; jerseyNumber: string; size: GarmentSize; shortSize: GarmentSize | null }> {
  return entries.map((entry) => ({
    playerName: entry.playerName,
    jerseyNumber: entry.jerseyNumber,
    size: entry.size,
    shortSize: entry.shortSize,
  }));
}
