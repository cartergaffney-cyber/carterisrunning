import type { LookupTerrainType } from "./types";

export interface ParsedCourseInfo {
  distanceMeters?: number;
  elevationGainMeters?: number;
  terrainType?: LookupTerrainType;
}

const MILES_TO_METERS = 1609.34;
const FEET_TO_METERS = 0.3048;

/** Best-effort keyword parse of race-page text for distance, elevation, and terrain. Not guaranteed to find anything. */
export function parseCoursePage(text: string): ParsedCourseInfo {
  const result: ParsedCourseInfo = {};
  const lower = text.toLowerCase();

  const distanceMatch = lower.match(/(\d{1,3}(?:\.\d+)?)\s*[-\s]?(mile|mi\b|km|kilometer|k\b)/);
  if (distanceMatch) {
    const value = parseFloat(distanceMatch[1]);
    const unit = distanceMatch[2];
    result.distanceMeters = unit.startsWith("mi") ? value * MILES_TO_METERS : value * 1000;
  }

  const elevationMatch = lower.match(
    /([\d,]{2,6})\s*(?:\+|ft|feet|')\s*(?:of\s+)?(?:elevation|climbing|vert|gain)/
  );
  if (elevationMatch) {
    const feet = parseFloat(elevationMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(feet)) {
      result.elevationGainMeters = feet * FEET_TO_METERS;
    }
  }

  if (lower.includes("trail run") || lower.includes("trail race") || lower.includes("single track") || lower.includes("singletrack")) {
    result.terrainType = "TRAIL";
  } else if (lower.includes("road race") || lower.includes("road course")) {
    result.terrainType = "ROAD";
  }

  return result;
}

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Best-effort "Month D, YYYY" extraction from free text (e.g. a search
 * snippet or fetched page). UTC-anchored, matching this app's date
 * convention (see utils/date.ts). Not guaranteed to find the *right* date
 * if a page mentions several -- callers surface it as an editable,
 * pre-filled suggestion rather than a silent, un-editable fact.
 */
export function parseDateFromText(text: string): Date | null {
  const pattern = new RegExp(`\\b(${MONTH_NAMES.join("|")})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i");
  const match = text.match(pattern);
  if (!match) return null;

  const monthIndex = MONTH_NAMES.indexOf(match[1].toLowerCase());
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (monthIndex < 0 || day < 1 || day > 31) return null;

  return new Date(Date.UTC(year, monthIndex, day));
}
