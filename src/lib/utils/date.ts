const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Every date in this app (workout.date, run.date's calendar day, race day)
// represents a CALENDAR DAY, not a moment tied to any particular person's
// clock -- so every function here is deliberately anchored to UTC rather
// than the ambient timezone of whatever machine happens to run the code.
// This app has no per-user timezone field, and its server code runs in
// different ambient timezones across environments (production serverless
// functions default to UTC; local dev runs in the developer's own system
// timezone) -- if date construction and reading both used ambient-local
// Date semantics, a date built in one environment would read back as the
// PREVIOUS calendar day when displayed or compared in another, since ambient
// ("local") getters implicitly convert through whatever timezone the
// current process happens to be in. Anchoring everything to UTC explicitly
// makes calendar-day math and comparisons produce the same result no matter
// which machine runs it. Any code that reads or formats one of these dates
// for display must do the same -- use the UTC getters, or pass
// `timeZone: "UTC"` to `toLocaleDateString`/`Intl.DateTimeFormat` -- rather
// than relying on ambient-local formatting.

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
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
  const day = date.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(date, diffToMonday);
}

/**
 * Parses a date-only "YYYY-MM-DD" string (as produced by an <input
 * type="date">) as UTC midnight -- the canonical, environment-independent
 * representation of that calendar day used throughout this app. (Plain
 * `new Date("YYYY-MM-DD")` also parses as UTC midnight, but goes through
 * string-parsing edge cases this avoids by parsing the components directly.)
 */
export function parseLocalDate(dateOnly: string): Date {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Today's calendar date at UTC midnight. */
export function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
