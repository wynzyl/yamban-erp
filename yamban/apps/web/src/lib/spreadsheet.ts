import * as XLSX from 'xlsx';

/**
 * Parses a spreadsheet file (Excel, CSV, etc.) and returns the rows as string arrays.
 * Uses only the first sheet. Returns empty array if file has no data.
 *
 * @param file The File object from a file input
 * @returns Promise resolving to an array of row arrays (each row is string[])
 */
export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use first sheet only (AC-9)
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return [];
  }

  // Convert to array of arrays, with all values as strings
  // header: 1 means return array of arrays (not objects)
  // raw: false means apply number formatting (we want strings)
  // defval: '' means empty cells become empty strings
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  // Convert all values to strings and filter out completely empty rows (AC-6)
  return rows
    .map((row) => row.map((cell) => String(cell ?? '').trim()))
    .filter((row) => row.some((cell) => cell !== ''));
}
