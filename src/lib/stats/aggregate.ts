import { addDays, mondayOfWeek, today } from "../utils/date";

export interface WeeklyMileagePoint {
  weekStart: Date;
  actualMiles: number;
  targetMiles: number;
}

/**
 * Trailing weeksBack weeks (Monday-anchored, ending with the current week),
 * each with total actual mileage from synced runs and total target mileage
 * from planned workouts. Ultra long runs are duration-based, not
 * distance-based, so they contribute 0 to targetMiles — a known display
 * limitation until Phase 6 threads real paces through.
 */
export function computeWeeklyMileageSeries(
  runs: { date: Date; distanceMiles: number }[],
  plannedWorkouts: { date: Date; targetDistanceMiles: number | null }[],
  weeksBack = 12
): WeeklyMileagePoint[] {
  const currentWeekStart = mondayOfWeek(today());
  const points: WeeklyMileagePoint[] = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -i * 7);
    const weekEnd = addDays(weekStart, 7);

    const actualMiles = runs
      .filter((r) => r.date >= weekStart && r.date < weekEnd)
      .reduce((sum, r) => sum + r.distanceMiles, 0);

    const targetMiles = plannedWorkouts
      .filter((w) => w.date >= weekStart && w.date < weekEnd)
      .reduce((sum, w) => sum + (w.targetDistanceMiles ?? 0), 0);

    points.push({ weekStart, actualMiles, targetMiles });
  }

  return points;
}

export interface PaceTrendPoint {
  weekStart: Date;
  avgPaceSecondsPerMile: number | null; // null if no runs that week
}

/** Weekly average pace, weighted by distance (total time / total miles), not a naive average of per-run paces. */
export function computePaceTrendSeries(
  runs: { date: Date; distanceMiles: number; durationSeconds: number }[],
  weeksBack = 12
): PaceTrendPoint[] {
  const currentWeekStart = mondayOfWeek(today());
  const points: PaceTrendPoint[] = [];

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = addDays(currentWeekStart, -i * 7);
    const weekEnd = addDays(weekStart, 7);

    const weekRuns = runs.filter((r) => r.date >= weekStart && r.date < weekEnd);
    const totalMiles = weekRuns.reduce((sum, r) => sum + r.distanceMiles, 0);
    const totalSeconds = weekRuns.reduce((sum, r) => sum + r.durationSeconds, 0);

    points.push({
      weekStart,
      avgPaceSecondsPerMile: totalMiles > 0 ? totalSeconds / totalMiles : null,
    });
  }

  return points;
}

export interface AdherencePoint {
  weekNumber: number;
  weekStart: Date;
  completedCount: number;
  totalCount: number;
  adherencePct: number | null;
}

/**
 * Per-week completion rate over non-rest planned workouts that have already
 * happened (future weeks haven't occurred yet, so they're excluded rather
 * than counted as 0%).
 */
export function computeAdherenceSeries(
  plannedWorkouts: { weekNumber: number; date: Date; workoutType: string; completed: boolean }[]
): AdherencePoint[] {
  const now = today();
  const byWeek = new Map<number, { weekStart: Date; completedCount: number; totalCount: number }>();

  for (const workout of plannedWorkouts) {
    if (workout.workoutType === "REST" || workout.date > now) continue;

    const entry = byWeek.get(workout.weekNumber) ?? {
      weekStart: workout.date,
      completedCount: 0,
      totalCount: 0,
    };
    entry.totalCount++;
    if (workout.completed) entry.completedCount++;
    if (workout.date < entry.weekStart) entry.weekStart = workout.date;
    byWeek.set(workout.weekNumber, entry);
  }

  return Array.from(byWeek.entries())
    .map(([weekNumber, { weekStart, completedCount, totalCount }]) => ({
      weekNumber,
      weekStart,
      completedCount,
      totalCount,
      adherencePct: totalCount > 0 ? (completedCount / totalCount) * 100 : null,
    }))
    .sort((a, b) => a.weekNumber - b.weekNumber);
}

export function computeOverallAdherencePct(adherenceSeries: AdherencePoint[]): number | null {
  const totalCompleted = adherenceSeries.reduce((sum, p) => sum + p.completedCount, 0);
  const totalScheduled = adherenceSeries.reduce((sum, p) => sum + p.totalCount, 0);
  return totalScheduled > 0 ? (totalCompleted / totalScheduled) * 100 : null;
}
