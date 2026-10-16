/**
 * Formatters from the Yamban guideline, "Formats" table.
 * Amounts arrive from the API as strings (Postgres numeric) to avoid float drift.
 */

const MINUS = '\u2212'; // true minus sign, not a hyphen
const PESO = '\u20B1';

const twoDp = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Numeric = number | string;

function toNumber(value: Numeric): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`Not a number: ${String(value)}`);
  return n;
}

/** ₱33,600.00 · −₱50,109.38 (always two decimals, no space after ₱). */
export function formatMoney(value: Numeric): string {
  const n = toNumber(value);
  // Avoid "−₱0.00" for values that round to zero.
  const rounded = Math.round(n * 100) / 100;
  const sign = rounded < 0 ? MINUS : '';
  return `${sign}${PESO}${twoDp.format(Math.abs(rounded))}`;
}

/** 1.50 yd — unit always shown. */
export function formatMeasure(value: Numeric, unitSuffix = 'yd'): string {
  return `${twoDp.format(toNumber(value))} ${unitSuffix}`;
}

/** Remaining yards, then roll length: 26.00 of 78 yd. */
export function formatRoll(remaining: Numeric, rollLength: Numeric): string {
  return `${twoDp.format(toNumber(remaining))} of ${toNumber(rollLength)} yd`;
}

const screenDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Manila',
});

/** 7 Mar 2026 (screen). Accepts Date or ISO string. */
export function formatDate(value: Date | string): string {
  return screenDate.format(typeof value === 'string' ? new Date(value) : value);
}

/** 2026-03-07 (exports). */
export function formatIsoDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(value);
}

/** +63 917 123 4567. Returns the input untouched if it is not a PH mobile number. */
export function formatMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('63') ? digits.slice(2) : digits.replace(/^0/, '');
  if (!/^9\d{9}$/.test(local)) return raw;
  return `+63 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/** Normalise a PH mobile number to E.164 (+639171234567) for storage, or null. */
export function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('63') ? digits.slice(2) : digits.replace(/^0/, '');
  return /^9\d{9}$/.test(local) ? `+63${local}` : null;
}
