import { riegelPredictTime } from "./riegel";
import { PACE_MULTIPLIERS } from "./pace-multipliers";
import { getDistanceCategory } from "./templates";
import type { FitnessSnapshotInput, RaceDistance, TrainingPaces } from "./types";

// Must match the reference distance used in lib/fitness-assessment when
// computing riegelEstimatedPaceSecondsPerMile, so the two stay comparable.
export const REFERENCE_DISTANCE_MILES = 6.214; // 10K

export interface DerivePacesInput {
  raceDistance: RaceDistance;
  raceDistanceMiles: number;
  goalTimeSeconds?: number;
  fitnessSnapshot?: FitnessSnapshotInput | null;
}

const FEASIBILITY_DIVERGENCE_THRESHOLD = 0.15;

/**
 * Derives the five training paces from either a goal finish time, an
 * implied goal projected via Riegel from recent fitness, or both. Returns
 * null when neither input is available -- callers fall back to a plan with
 * no pace targets (Phase 2 behavior), not an error.
 */
export function deriveTrainingPaces(input: DerivePacesInput): TrainingPaces | null {
  const category = getDistanceCategory(input.raceDistance);
  const multipliers = PACE_MULTIPLIERS[category];

  const impliedPaceFromFitness = input.fitnessSnapshot?.riegelEstimatedPaceSecondsPerMile
    ? riegelPredictTime(
        input.fitnessSnapshot.riegelEstimatedPaceSecondsPerMile * REFERENCE_DISTANCE_MILES,
        REFERENCE_DISTANCE_MILES,
        input.raceDistanceMiles
      ) / input.raceDistanceMiles
    : null;

  let racePaceSecondsPerMile: number;
  let paceBasis: TrainingPaces["paceBasis"];
  let feasibilityNote: string | undefined;

  if (input.goalTimeSeconds) {
    racePaceSecondsPerMile = input.goalTimeSeconds / input.raceDistanceMiles;
    paceBasis = "GOAL_TIME";

    if (impliedPaceFromFitness) {
      const divergence = Math.abs(racePaceSecondsPerMile - impliedPaceFromFitness) / impliedPaceFromFitness;
      if (divergence > FEASIBILITY_DIVERGENCE_THRESHOLD) {
        paceBasis = "BLENDED";
        feasibilityNote =
          racePaceSecondsPerMile < impliedPaceFromFitness
            ? "Your goal pace is notably faster than recent fitness suggests -- treat early workouts as aspirational and reassess as training progresses."
            : "Your goal pace is comfortably conservative relative to your recent fitness.";
      }
    }
  } else if (impliedPaceFromFitness) {
    racePaceSecondsPerMile = impliedPaceFromFitness;
    paceBasis = "CURRENT_FITNESS";
  } else {
    return null;
  }

  return {
    easyPaceSecondsPerMile: Math.round(racePaceSecondsPerMile * multipliers.easy),
    tempoPaceSecondsPerMile: Math.round(racePaceSecondsPerMile * multipliers.tempo),
    intervalPaceSecondsPerMile: Math.round(racePaceSecondsPerMile * multipliers.interval),
    longRunPaceSecondsPerMile: Math.round(racePaceSecondsPerMile * multipliers.long),
    racePaceSecondsPerMile: Math.round(racePaceSecondsPerMile),
    paceBasis,
    feasibilityNote,
  };
}
