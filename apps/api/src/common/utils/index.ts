/**
 * Shared utility functions for the API.
 */

/**
 * Escapes special characters in a search term for use in SQL LIKE patterns.
 * Wraps the term with % wildcards for partial matching.
 *
 * @example
 * escapeLikeTerm('test') // '%test%'
 * escapeLikeTerm('100%') // '%100\\%%'
 */
export function escapeLikeTerm(search: string): string {
  return `%${search.replace(/[%_\\]/g, '\\$&')}%`;
}

/**
 * Safely parses a decimal string to a number, returning 0 for null/undefined values.
 * Use this instead of raw parseFloat() for monetary/numeric database values.
 *
 * @example
 * parseDecimal('123.45') // 123.45
 * parseDecimal(null)     // 0
 * parseDecimal(undefined) // 0
 */
export function parseDecimal(value: string | null | undefined): number {
  return parseFloat(value ?? '0');
}

/**
 * Formats a number as a fixed decimal string with the specified precision.
 * Useful for monetary values (2 decimals) and quantities (3 decimals).
 *
 * @example
 * toFixedDecimal(123.456, 2) // '123.46'
 * toFixedDecimal(null, 2)    // '0.00'
 */
export function toFixedDecimal(
  value: number | string | null | undefined,
  precision: number,
): string {
  const num = typeof value === 'number' ? value : parseDecimal(value);
  return num.toFixed(precision);
}
