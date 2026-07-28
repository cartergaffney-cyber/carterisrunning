import { addDays, mondayOfWeek, today } from "@/lib/utils/date";

export type MileageTrendDirection = "INCREASING" | "STABLE" | "DECREASING";

export interface MileageTrendResult {
  avgWeeklyMileageMiles: number;
  trend: MileageTrendDirection;
}

const TREND_THRESHOLD_PCT = 0.1;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Buckets runs into Monday-anchored weeks and compares the first half of the
 * window against the second half to classify the mileage trend. */
export function computeWeeklyMileageTrend(
  runs: { date: Date; distanceMiles: number }[],
  windowWeeks: number
): MileageTrendResult {
  const currentWeekStart = mondayOfWeek(today());
  const weeklyTotals: number[] = [];

  for (let i = windowWeeks - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -i * 7);
    const weekEnd = addDays(weekStart, 7);
    const total = runs
      .filter((r) => r.date >= weekStart && r.date < weekEnd)
      .reduce((sum, r) => sum + r.distanceMiles, 0);
    weeklyTotals.push(total);
  }

  const avgWeeklyMileageMiles = average(weeklyTotals);

  const half = Math.floor(weeklyTotals.length / 2);
  const firstHalfAvg = average(weeklyTotals.slice(0, half));
  const secondHalfAvg = average(weeklyTotals.slice(half));
  const change = firstHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg : 0;

  let trend: MileageTrendDirection = "STABLE";
  if (change > TREND_THRESHOLD_PCT) trend = "INCREASING";
  else if (change < -TREND_THRESHOLD_PCT) trend = "DECREASING";

  return { avgWeeklyMileageMiles, trend };
}
