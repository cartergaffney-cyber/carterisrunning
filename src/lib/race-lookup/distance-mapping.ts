import { DISTANCE_MILES } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";

const METERS_TO_MILES = 1 / 1609.34;

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
