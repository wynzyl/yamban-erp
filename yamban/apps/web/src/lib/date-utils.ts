/**
 * Date utility functions for reports.
 * This file is server compatible (no 'use client').
 */

export function getPresetDates(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case 'this_month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    }
    case 'last_30': {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    }
    case 'this_quarter': {
      const q = Math.floor(month / 3);
      const start = new Date(year, q * 3, 1);
      const end = new Date(year, q * 3 + 3, 0);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    }
    case 'last_quarter': {
      const q = Math.floor(month / 3) - 1;
      const qYear = q < 0 ? year - 1 : year;
      const qMonth = q < 0 ? 3 : q;
      const start = new Date(qYear, qMonth * 3, 1);
      const end = new Date(qYear, qMonth * 3 + 3, 0);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    }
    case 'last_year': {
      const start = new Date(year - 1, 0, 1);
      const end = new Date(year - 1, 11, 31);
      return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
    }
    default:
      return { startDate: formatDateISO(now), endDate: formatDateISO(now) };
  }
}

function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function getDefaultDateRange(): { startDate: string; endDate: string } {
  return getPresetDates('this_month');
}
