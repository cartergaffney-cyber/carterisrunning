import type { WorkoutType } from "@/lib/plan-generator/types";
import type { ComparisonStatus, RunComparison } from "./types";

const DISTANCE_TOLERANCE = 0.15;
const PACE_TOLERANCE_SECONDS_PER_MILE = 20;
const STRONG_PACE_OVERRIDE_SECONDS_PER_MILE = 30;

const VOLUME_PRIMARY_TYPES = new Set<WorkoutType>(["LONG_RUN", "BACK_TO_BACK_LONG"]);
const NOT_GRADED_TYPES = new Set<WorkoutType>(["REST", "CROSS_TRAIN", "RACE"]);

interface WorkoutTarget {
  workoutType: WorkoutType;
  targetDistanceMiles: number | null;
  targetDurationMinutes: number | null;
  targetPaceSecondsPerMile: number | null;
}

interface ActualRun {
  distanceMiles: number;
  durationSeconds: number;
  avgPaceSecondsPerMile: number;
}

/**
 * Compares a completed run to its assigned workout. Returns null when
 * there's nothing meaningful to grade (rest/cross-train days have no
 * running target; race day is graded by result, not against a training
 * stimulus). Pace is the primary signal for intensity-based sessions
 * (easy/tempo/interval/race-pace) since that's what defines the prescribed
 * effort; distance/duration is primary for volume-based sessions (long run /
 * back-to-back), since time-on-feet is the point of those days -- but an
 * unusually fast long run still flags TOO_HARD even with on-target mileage,
 * since pace on a long run is itself a real overtraining/injury signal.
 */
export function compareRunToWorkout(run: ActualRun, workout: WorkoutTarget): RunComparison | null {
  if (NOT_GRADED_TYPES.has(workout.workoutType)) {
    return null;
  }

  const paceDelta =
    workout.targetPaceSecondsPerMile != null
      ? run.avgPaceSecondsPerMile - workout.targetPaceSecondsPerMile
      : undefined;

  if (VOLUME_PRIMARY_TYPES.has(workout.workoutType)) {
    const durationRatio = workout.targetDurationMinutes
      ? run.durationSeconds / 60 / workout.targetDurationMinutes
      : undefined;
    const distanceRatio = workout.targetDistanceMiles
      ? run.distanceMiles / workout.targetDistanceMiles
      : undefined;
    const ratio = durationRatio ?? distanceRatio;

    if (ratio == null) return null;

    let status: ComparisonStatus =
      ratio > 1 + DISTANCE_TOLERANCE ? "TOO_HARD" : ratio < 1 - DISTANCE_TOLERANCE ? "TOO_EASY" : "ON_TARGET";

    if (status !== "TOO_HARD" && paceDelta != null && paceDelta < -STRONG_PACE_OVERRIDE_SECONDS_PER_MILE) {
      status = "TOO_HARD";
    }

    return {
      status,
      primarySignal: durationRatio != null ? "duration" : "distance",
      distanceRatio,
      durationRatio,
      paceDeltaSecondsPerMile: paceDelta,
    };
  }

  if (paceDelta != null) {
    const status: ComparisonStatus =
      paceDelta < -PACE_TOLERANCE_SECONDS_PER_MILE
        ? "TOO_HARD"
        : paceDelta > PACE_TOLERANCE_SECONDS_PER_MILE
          ? "TOO_EASY"
          : "ON_TARGET";
    return { status, primarySignal: "pace", paceDeltaSecondsPerMile: paceDelta };
  }

  if (workout.targetDistanceMiles) {
    const distanceRatio = run.distanceMiles / workout.targetDistanceMiles;
    const status: ComparisonStatus =
      distanceRatio > 1 + DISTANCE_TOLERANCE
        ? "TOO_HARD"
        : distanceRatio < 1 - DISTANCE_TOLERANCE
          ? "TOO_EASY"
          : "ON_TARGET";
    return { status, primarySignal: "distance", distanceRatio };
  }

  return null;
}
