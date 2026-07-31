import { DISTANCE_MILES } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";

const METERS_TO_MILES = 1 / 1609.34;
const MILES_TO_METERS = 1609.34;

/** Maps an arbitrary looked-up distance to the closest of the 6 supported RaceDistance categories. */
export function mapMetersToRaceDistance(meters: number): RaceDistance {
  const miles = meters * METERS_TO_MILES;

  let closest: RaceDistance = "MARATHON";
  let smallestDiff = Infinity;

  for (const [distance, distanceMiles] of Object.entries(DISTANCE_MILES) as [RaceDistance, number][]) {
    const diff = Math.abs(distanceMiles - miles);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = distance;
    }
  }

  return closest;
}

/**
 * Best-effort distance inference from a race's own name, e.g. "Boston
 * Marathon" -> 26.2mi. Only covers standard, unambiguous road-race naming
 * conventions -- never guesses for a name that doesn't clearly say. Unlike
 * scraping a date out of arbitrary page text (which can easily grab an
 * unrelated article or historical-results date), a race's own name is a
 * reliable signal for its distance: races are almost never named "X
 * Marathon" unless they're marathon distance. "half marathon" is checked
 * before bare "marathon" since it contains that word too.
 */
export function inferDistanceMetersFromName(name: string): number | null {
  const lower = name.toLowerCase();

  const numericMatch = lower.match(/(\d{1,3}(?:\.\d+)?)\s*[-\s]?(mile|mi\b|km|kilometer|k\b)/);
  if (numericMatch) {
    const value = parseFloat(numericMatch[1]);
    const unit = numericMatch[2];
    return unit.startsWith("mi") ? value * MILES_TO_METERS : value * 1000;
  }

  if (lower.includes("half marathon") || lower.includes("half-marathon")) {
    return 13.1 * MILES_TO_METERS;
  }
  if (lower.includes("marathon")) {
    return 26.2 * MILES_TO_METERS;
  }

  return null;
}
