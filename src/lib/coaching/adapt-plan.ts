import { prisma } from "@/lib/db";
import { addDays, mondayOfWeek } from "@/lib/utils/date";
import { formatPaceSecondsPerMile } from "@/lib/utils/pace";
import { WORKOUT_TYPE_LABELS } from "@/lib/plan-generator/labels";
import type { WorkoutType } from "@/lib/plan-generator/types";
import type { ComparisonStatus, EffortTier } from "./types";

const HARD_TYPES = new Set<WorkoutType>([
  "TEMPO",
  "INTERVAL",
  "RACE_PACE",
  "LONG_RUN",
  "BACK_TO_BACK_LONG",
  "RACE",
]);
const LONG_RUN_TYPES = new Set<WorkoutType>(["LONG_RUN", "BACK_TO_BACK_LONG"]);

// A downgraded tempo/interval/race-pace day becomes a generic easy run at
// this fraction of its original target distance. A downgraded long run
// keeps its identity (long runs serve a distinct, less substitutable
// aerobic-durability purpose) but is trimmed and slowed instead of replaced
// outright. Both factors are tunable coaching judgment calls, not physiology.
const DOWNGRADE_DISTANCE_FACTOR = 0.7;
const LONG_RUN_SOFTEN_FACTOR = 0.75;
const DEFAULT_RECOVERY_MILES = 3;

export interface AdaptationResult {
  date: Date;
  originalWorkoutType: WorkoutType;
  newWorkoutType: WorkoutType;
  /** Shown on the future (changed) workout block. */
  reason: string;
  /** Shown appended to the coach commentary on the run that caused the change. */
  triggerSummary: string;
}

interface OriginWorkout {
  id: string;
  date: Date;
  workoutType: WorkoutType;
}

interface PlanPaces {
  id: string;
  easyPaceSecondsPerMile: number | null;
}

/**
 * Looks at the rest of the current training week after a just-completed run
 * and, if that run represented unplanned hard-day stress, softens the next
 * scheduled hard day to protect the hard/easy balance the rest of the week
 * depends on. Scoped deliberately to the remainder of the CURRENT week only
 * (not a multi-week cascade) and to softening forward (not upgrading a later
 * day to make up for a missed or undershot hard session) -- crowding in a
 * make-up hard effort is a worse coaching decision than just letting one
 * session go, so a missed/undershot hard day is flagged in commentary only
 * and never forces a schedule change.
 */
export async function adaptFutureWorkouts(params: {
  plan: PlanPaces;
  originWorkout: OriginWorkout;
  actualTier: EffortTier;
  scheduledTier: EffortTier;
  comparisonStatus: ComparisonStatus | null;
}): Promise<AdaptationResult | null> {
  const unplannedHardEffort = params.actualTier === "HARD" && params.scheduledTier === "EASY";
  const overshotHardDay =
    params.actualTier === "HARD" && params.scheduledTier === "HARD" && params.comparisonStatus === "TOO_HARD";

  if (!unplannedHardEffort && !overshotHardDay) return null;

  const weekEnd = addDays(mondayOfWeek(params.originWorkout.date), 6);

  const candidates = await prisma.plannedWorkout.findMany({
    where: {
      trainingPlanId: params.plan.id,
      date: { gt: params.originWorkout.date, lte: weekEnd },
      run: null,
    },
    orderBy: { date: "asc" },
  });

  const nextHard = candidates.find((w) => HARD_TYPES.has(w.workoutType as WorkoutType));
  if (!nextHard) return null;

  const originalWorkoutType = nextHard.workoutType as WorkoutType;
  const isLongRunFamily = LONG_RUN_TYPES.has(originalWorkoutType);
  const easyPace = params.plan.easyPaceSecondsPerMile ?? nextHard.targetPaceSecondsPerMile ?? null;

  let newWorkoutType: WorkoutType;
  let updateData: {
    workoutType: WorkoutType;
    targetDistanceMiles: number | null;
    targetDurationMinutes: number | null;
    targetPaceSecondsPerMile: number | null;
    description: string;
  };

  if (isLongRunFamily) {
    newWorkoutType = originalWorkoutType;
    const newDistance =
      nextHard.targetDistanceMiles != null
        ? Math.round(nextHard.targetDistanceMiles * LONG_RUN_SOFTEN_FACTOR * 10) / 10
        : null;
    const newDuration =
      nextHard.targetDurationMinutes != null
        ? Math.round((nextHard.targetDurationMinutes * LONG_RUN_SOFTEN_FACTOR) / 5) * 5
        : null;
    updateData = {
      workoutType: newWorkoutType,
      targetDistanceMiles: newDistance,
      targetDurationMinutes: newDuration,
      targetPaceSecondsPerMile: easyPace,
      description: newDuration
        ? `Long run, shortened: ~${newDuration} min time-on-feet at an easy effort.`
        : `${newDistance?.toFixed(1)} mi long run, shortened and slowed to an easy effort${
            easyPace ? ` @ ${formatPaceSecondsPerMile(easyPace)}` : ""
          }.`,
    };
  } else {
    newWorkoutType = "EASY";
    const newDistance =
      nextHard.targetDistanceMiles != null
        ? Math.round(nextHard.targetDistanceMiles * DOWNGRADE_DISTANCE_FACTOR * 10) / 10
        : DEFAULT_RECOVERY_MILES;
    updateData = {
      workoutType: newWorkoutType,
      targetDistanceMiles: newDistance,
      targetDurationMinutes: null,
      targetPaceSecondsPerMile: easyPace,
      description: `${newDistance.toFixed(1)} mi easy${
        easyPace ? ` @ ${formatPaceSecondsPerMile(easyPace)}` : ""
      } — recovery day.`,
    };
  }

  const causeLabel = unplannedHardEffort ? "an unplanned hard effort" : "a harder/longer effort than planned";
  const originDayLabel = params.originWorkout.date.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  const targetDayLabel = nextHard.date.toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  const originalLabel = WORKOUT_TYPE_LABELS[originalWorkoutType];

  const reason = `Softened from ${originalLabel} to ${
    isLongRunFamily ? "an easier long run" : "an easy recovery day"
  } because you logged ${causeLabel} on ${originDayLabel}. Stacking another hard day right after would crowd your recovery, so this session was eased back to protect the rest of the week.`;

  await prisma.plannedWorkout.update({
    where: { id: nextHard.id },
    data: { ...updateData, adaptationReason: reason },
  });

  return {
    date: nextHard.date,
    originalWorkoutType,
    newWorkoutType,
    reason,
    triggerSummary: `Because of this, I've eased ${targetDayLabel}'s planned ${originalLabel} into ${
      isLongRunFamily ? "a shorter, easier long run" : "a recovery day"
    } to keep your hard/easy balance intact.`,
  };
}
