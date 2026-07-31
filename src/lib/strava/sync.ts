import { prisma } from "@/lib/db";
import { parseStravaLocalDate, StravaSummaryActivity } from "./client";
import { runCoachingPipeline } from "@/lib/coaching/on-link";
import type { Prisma } from "@/generated/prisma/client";

const METERS_TO_MILES = 1 / 1609.34;
const METERS_TO_FEET = 3.28084;

const RUNNABLE_SPORT_TYPES = new Set(["Run", "TrailRun"]);

export function isRunActivity(activity: StravaSummaryActivity): boolean {
  return RUNNABLE_SPORT_TYPES.has(activity.sport_type);
}

export function mapActivityToRun(
  activity: StravaSummaryActivity,
  userId: string
): Prisma.RunUncheckedCreateInput {
  const distanceMiles = activity.distance * METERS_TO_MILES;
  const durationSeconds = activity.moving_time;

  return {
    userId,
    stravaActivityId: BigInt(activity.id),
    name: activity.name,
    sportType: activity.sport_type,
    date: parseStravaLocalDate(activity.start_date_local),
    distanceMiles,
    durationSeconds,
    avgPaceSecondsPerMile: distanceMiles > 0 ? Math.round(durationSeconds / distanceMiles) : 0,
    elevationGainFeet: activity.total_elevation_gain * METERS_TO_FEET,
    sufferScore: activity.suffer_score ?? null,
    avgHeartRate: activity.average_heartrate != null ? Math.round(activity.average_heartrate) : null,
  };
}

export interface UpsertRunsResult {
  createdCount: number;
  updatedCount: number;
  upsertedRunIds: string[];
}

export async function upsertRuns(
  userId: string,
  activities: StravaSummaryActivity[]
): Promise<UpsertRunsResult> {
  let createdCount = 0;
  let updatedCount = 0;
  const upsertedRunIds: string[] = [];

  for (const activity of activities.filter(isRunActivity)) {
    const stravaActivityId = BigInt(activity.id);
    const data = mapActivityToRun(activity, userId);

    const existing = await prisma.run.findUnique({ where: { stravaActivityId } });

    const run = await prisma.run.upsert({
      where: { stravaActivityId },
      create: data,
      update: data,
    });

    if (existing) {
      updatedCount++;
    } else {
      createdCount++;
    }
    upsertedRunIds.push(run.id);
  }

  return { createdCount, updatedCount, upsertedRunIds };
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export interface AutoLinkResult {
  linkedCount: number;
}

/**
 * Best-effort match of newly-synced runs to the user's active plan: for
 * each unlinked run, if exactly one non-rest planned workout on the active
 * plan falls on the same calendar day and doesn't already have a linked
 * run, link them and mark the workout completed. Ambiguous or missing
 * matches are left for manual linking on the run detail page.
 */
export async function autoLinkRuns(userId: string, runIds: string[]): Promise<AutoLinkResult> {
  if (runIds.length === 0) return { linkedCount: 0 };

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: "ACTIVE" },
    include: { plannedWorkouts: { where: { workoutType: { not: "REST" } } } },
  });

  if (!activePlan) return { linkedCount: 0 };

  const unlinkedWorkouts = activePlan.plannedWorkouts.filter((w) => !w.completed);

  const runs = await prisma.run.findMany({
    where: { id: { in: runIds }, plannedWorkoutId: null },
  });

  let linkedCount = 0;

  for (const run of runs) {
    const candidates = unlinkedWorkouts.filter((w) => isSameCalendarDay(w.date, run.date));

    if (candidates.length === 1) {
      const workout = candidates[0];
      await prisma.$transaction([
        prisma.run.update({ where: { id: run.id }, data: { plannedWorkoutId: workout.id } }),
        prisma.plannedWorkout.update({ where: { id: workout.id }, data: { completed: true } }),
      ]);
      await runCoachingPipeline(run.id, workout.id);
      linkedCount++;
      // Remove the matched workout from further consideration this sync.
      const index = unlinkedWorkouts.indexOf(workout);
      if (index !== -1) unlinkedWorkouts.splice(index, 1);
    }
  }

  return { linkedCount };
}
