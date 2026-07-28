const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Whole weeks between two dates, rounded up, minimum 1. */
export function weeksBetween(from: Date, to: Date): number {
  return Math.max(1, Math.ceil(diffInDays(from, to) / 7));
}

/** The Monday of the calendar week containing the given date. */
export function mondayOfWeek(date: Date): Date {
  const day = date.getDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(date, diffToMonday);
}

/**
 * Parses a date-only "YYYY-MM-DD" string (as produced by an <input
 * type="date">) as local midnight. `new Date("YYYY-MM-DD")` parses as UTC
 * midnight instead, which silently shifts to the previous calendar day in
 * any timezone behind UTC — this is the correct way to read date-only form
 * input anywhere in the app.
 */
export function parseLocalDate(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Today at local midnight. */
export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
