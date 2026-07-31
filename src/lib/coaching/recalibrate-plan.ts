import { prisma } from "@/lib/db";
import { addDays, diffInDays, today } from "@/lib/utils/date";
import { compareRunToWorkout } from "./compare-run";
import { describeWorkout } from "@/lib/plan-generator/workout-builder";
import { getTrailingLongestRunMiles, maxSafeDistance } from "./long-run-spike-risk";
import { shouldPreferConciseVariant } from "./note-feedback";
import type { WorkoutType } from "@/lib/plan-generator/types";
import type { TrainingPlan } from "@/generated/prisma/client";

const LONG_RUN_FAMILY = new Set<WorkoutType>(["LONG_RUN", "BACK_TO_BACK_LONG"]);

// Looks at a trailing two-week window of graded runs against an active
// plan and, if there's a clear sustained pattern (not just one or two
// sessions), recalibrates the paces and remaining mileage for the rest of
// the plan -- distinct from the single-day adaptation in adapt-plan.ts,
// which reacts to one run at a time. This is the "is the whole plan running
// ahead of or behind schedule" check. Thresholds below are coaching
// judgment calls, tunable, not physiological constants.
const WINDOW_DAYS = 14;
const MIN_GRADED_SAMPLES = 5;
const AHEAD_TOO_HARD_RATIO = 0.6;
const BEHIND_RATIO = 0.5;
const MIN_DAYS_BETWEEN_RECALIBRATIONS = 10;

const PACE_MULTIPLIER_AHEAD = 0.96; // ~4% faster
const PACE_MULTIPLIER_BEHIND = 1.05; // ~5% slower
const MILEAGE_SCALE_AHEAD = 1.06;
const MILEAGE_SCALE_BEHIND = 0.85;

interface PaceFields {
  easyPaceSecondsPerMile: number | null;
  tempoPaceSecondsPerMile: number | null;
  intervalPaceSecondsPerMile: number | null;
  longRunPaceSecondsPerMile: number | null;
  racePaceSecondsPerMile: number | null;
}

const PACE_FIELD_BY_WORKOUT_TYPE: Partial<Record<WorkoutType, keyof PaceFields>> = {
  EASY: "easyPaceSecondsPerMile",
  TEMPO: "tempoPaceSecondsPerMile",
  INTERVAL: "intervalPaceSecondsPerMile",
  RACE_PACE: "racePaceSecondsPerMile",
  LONG_RUN: "longRunPaceSecondsPerMile",
  BACK_TO_BACK_LONG: "longRunPaceSecondsPerMile",
};

type RecalibrationDirection = "AHEAD" | "BEHIND";

interface WindowStats {
  onTarget: number;
  tooHard: number;
  tooEasy: number;
  missed: number;
  graded: number;
}

/**
 * Entry point, called after a Strava sync. A user can have more than one
 * active plan at once (plans are no longer auto-archived), so this checks
 * each one independently -- recalibration is plan-scoped judgment, not
 * something that should only ever apply to a single "the" active plan.
 */
export async function checkAndRecalibratePlan(userId: string): Promise<void> {
  const plans = await prisma.trainingPlan.findMany({ where: { userId, status: "ACTIVE" } });
  for (const plan of plans) {
    await checkAndRecalibrateSinglePlan(plan);
  }
}

async function checkAndRecalibrateSinglePlan(plan: TrainingPlan): Promise<void> {
  const now = today();

  if (plan.lastRecalibratedAt && diffInDays(plan.lastRecalibratedAt, now) < MIN_DAYS_BETWEEN_RECALIBRATIONS) {
    return;
  }

  const windowStart = addDays(now, -WINDOW_DAYS);

  const recentWorkouts = await prisma.plannedWorkout.findMany({
    where: {
      trainingPlanId: plan.id,
      date: { gte: windowStart, lt: now },
      workoutType: { notIn: ["REST", "CROSS_TRAIN"] },
    },
    include: { run: true },
  });

  const stats: WindowStats = { onTarget: 0, tooHard: 0, tooEasy: 0, missed: 0, graded: 0 };

  for (const workout of recentWorkouts) {
    if (workout.run) {
      const comparison = compareRunToWorkout(workout.run, {
        workoutType: workout.workoutType as WorkoutType,
        targetDistanceMiles: workout.targetDistanceMiles,
        targetDurationMinutes: workout.targetDurationMinutes,
        targetPaceSecondsPerMile: workout.targetPaceSecondsPerMile,
      });
      if (comparison?.status === "ON_TARGET") stats.onTarget++;
      else if (comparison?.status === "TOO_HARD") stats.tooHard++;
      else if (comparison?.status === "TOO_EASY") stats.tooEasy++;
    } else {
      stats.missed++;
    }
  }

  stats.graded = stats.onTarget + stats.tooHard + stats.tooEasy;
  if (stats.graded < MIN_GRADED_SAMPLES) return;

  const tooHardRatio = stats.tooHard / stats.graded;
  const behindRatio = (stats.tooEasy + stats.missed) / (stats.graded + stats.missed);

  let direction: RecalibrationDirection | null = null;
  if (tooHardRatio >= AHEAD_TOO_HARD_RATIO) direction = "AHEAD";
  else if (behindRatio >= BEHIND_RATIO) direction = "BEHIND";

  if (!direction) return;

  await applyRecalibration(plan, direction, stats);
}

function scalePace(pace: number | null, multiplier: number): number | null {
  return pace != null ? Math.round(pace * multiplier) : null;
}

async function applyRecalibration(plan: TrainingPlan, direction: RecalibrationDirection, stats: WindowStats) {
  const paceMultiplier = direction === "AHEAD" ? PACE_MULTIPLIER_AHEAD : PACE_MULTIPLIER_BEHIND;
  const mileageScale = direction === "AHEAD" ? MILEAGE_SCALE_AHEAD : MILEAGE_SCALE_BEHIND;

  const newPaces: PaceFields = {
    easyPaceSecondsPerMile: scalePace(plan.easyPaceSecondsPerMile, paceMultiplier),
    tempoPaceSecondsPerMile: scalePace(plan.tempoPaceSecondsPerMile, paceMultiplier),
    intervalPaceSecondsPerMile: scalePace(plan.intervalPaceSecondsPerMile, paceMultiplier),
    longRunPaceSecondsPerMile: scalePace(plan.longRunPaceSecondsPerMile, paceMultiplier),
    racePaceSecondsPerMile: scalePace(plan.racePaceSecondsPerMile, paceMultiplier),
  };

  const now = today();

  // Only not-yet-run future workouts are rescaled -- history is immutable,
  // and race day is the goal distance, not a training target to rescale.
  const futureWorkouts = await prisma.plannedWorkout.findMany({
    where: { trainingPlanId: plan.id, date: { gte: now }, workoutType: { not: "RACE" }, run: null },
  });

  // When speeding the plan up, cap how far any single long run's distance
  // can grow so the recalibration itself never manufactures the single-
  // session spike risk documented in KNOWLEDGE.md Section 3 -- the plan
  // should never schedule a "correction" that's itself the injury trigger.
  const trailingLongestMiles =
    direction === "AHEAD" ? await getTrailingLongestRunMiles(plan.userId, now) : null;
  const safeLongRunCap = maxSafeDistance(trailingLongestMiles);

  for (const workout of futureWorkouts) {
    const workoutType = workout.workoutType as WorkoutType;
    const paceKey = PACE_FIELD_BY_WORKOUT_TYPE[workoutType];
    const newPace = paceKey ? newPaces[paceKey] : workout.targetPaceSecondsPerMile;
    let newDistance =
      workout.targetDistanceMiles != null ? Math.round(workout.targetDistanceMiles * mileageScale * 10) / 10 : null;
    if (newDistance != null && safeLongRunCap != null && LONG_RUN_FAMILY.has(workoutType)) {
      newDistance = Math.min(newDistance, Math.round(safeLongRunCap * 10) / 10);
    }
    const newDuration =
      workout.targetDurationMinutes != null
        ? Math.round((workout.targetDurationMinutes * mileageScale) / 5) * 5
        : null;

    await prisma.plannedWorkout.update({
      where: { id: workout.id },
      data: {
        targetDistanceMiles: newDistance,
        targetDurationMinutes: newDuration,
        targetPaceSecondsPerMile: newPace,
        description: describeWorkout(workoutType, newDistance ?? undefined, newDuration ?? undefined, newPace ?? undefined),
      },
    });
  }

  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { ...newPaces, lastRecalibratedAt: now },
  });

  const kind = direction === "AHEAD" ? "PLAN_RECALIBRATED_FASTER" : "PLAN_RECALIBRATED_SLOWER";
  const concise = await shouldPreferConciseVariant(plan.userId, kind);

  await prisma.coachNote.create({
    data: {
      userId: plan.userId,
      trainingPlanId: plan.id,
      kind,
      message: buildRecalibrationMessage(direction, stats, paceMultiplier, concise),
    },
  });
}

/**
 * `concise` is driven by thumbs-down feedback on past notes of this kind
 * (see note-feedback.ts) -- drops the framing/explanation sentences and
 * states just the pace change once a user (or the user base overall) has
 * voted a majority of these unhelpful.
 */
function buildRecalibrationMessage(
  direction: RecalibrationDirection,
  stats: WindowStats,
  paceMultiplier: number,
  concise: boolean
): string {
  const pctPaceChange = Math.round(Math.abs(1 - paceMultiplier) * 100);

  if (direction === "AHEAD") {
    if (concise) {
      return `Target paces sped up by about ${pctPaceChange}% based on your last two weeks of runs.`;
    }
    return (
      `Nice work — over the last two weeks, ${stats.tooHard} of your ${stats.graded} graded runs came in noticeably ` +
      `harder than planned. That's a sign your fitness has moved past what this plan assumed, so I've sped up your ` +
      `target paces by about ${pctPaceChange}% and nudged the remaining mileage up slightly to keep the plan ` +
      `challenging. You'll see the updated targets on upcoming days.`
    );
  }

  const struggledCount = stats.tooEasy + stats.missed;
  const totalConsidered = stats.graded + stats.missed;
  if (concise) {
    return `Target paces eased by about ${pctPaceChange}% based on your last two weeks of runs.`;
  }
  return (
    `Heads up — over the last two weeks, ${struggledCount} of your last ${totalConsidered} scheduled runs came in ` +
    `slower than planned or were missed. Rather than keep pushing a progression that isn't landing, I've eased your ` +
    `target paces by about ${pctPaceChange}% and pulled back the remaining mileage ramp. This keeps the rest of the ` +
    `plan sustainable instead of digging a deeper fatigue hole.`
  );
}
