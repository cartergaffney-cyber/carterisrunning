export interface RunSignupAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country_code?: string | null;
}

/** Parses distance strings like "26.2 Miles", "50 Kilometers", "5K" into meters. */
export function parseDistanceToMeters(distance: string): number | null {
  const match = distance.match(/([\d.]+)\s*(miles?|mi\b|kilometers?|km\b|k\b)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("mi")) return value * 1609.34;
  if (unit.startsWith("km") || unit === "k") return value * 1000;
  return null;
}

/**
 * Parses RunSignup's "M/D/YYYY HH:mm" wall-clock format, anchored to UTC
 * (Date.UTC, not the ambient-local constructor) so the resulting calendar
 * date reads back the same regardless of which timezone the server process
 * happens to run in -- see src/lib/utils/date.ts's module docstring for why
 * this app anchors all calendar dates to UTC.
 */
export function parseRunSignupDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;

  const [, month, day, year, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour ?? 0), Number(minute ?? 0)));
}

/** Strips HTML tags and collapses whitespace, e.g. for RunSignup's HTML race descriptions. Truncates to a short blurb length. */
export function stripHtmlToBlurb(html: string | null | undefined, maxLength = 400): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
