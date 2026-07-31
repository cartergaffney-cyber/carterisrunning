import type { WorkoutType } from "@/lib/plan-generator/types";
import type { EffortTier } from "./types";

const HARD_WORKOUT_TYPES = new Set<WorkoutType>([
  "TEMPO",
  "INTERVAL",
  "RACE_PACE",
  "LONG_RUN",
  "BACK_TO_BACK_LONG",
  "RACE",
]);

export function classifyScheduledTier(workoutType: WorkoutType): EffortTier {
  return HARD_WORKOUT_TYPES.has(workoutType) ? "HARD" : "EASY";
}

// A run counts as a HARD effort if its pace sits closer to tempo effort than
// to easy effort -- the midpoint between the plan's own easy and tempo pace
// zones -- or if it went long enough to carry meaningful fatigue regardless
// of pace (a slow long run is still a hard day physiologically). Using the
// midpoint rather than a small fixed buffer around tempo pace matters: a run
// a bit slower than exact tempo pace is still clearly a harder effort than an
// easy day and should be treated as such. This is deliberately a binary
// hard/easy classification rather than a finer scale, following the standard
// "polarized training" principle -- what matters most for next-day planning
// is not stacking two hard days back to back, not exactly how hard a hard
// day was. Thresholds are tunable, not physiological constants.
const LONG_EFFORT_MINUTES = 90;

export function classifyActualEffortTier(
  run: { durationSeconds: number; avgPaceSecondsPerMile: number },
  planPaces: { easyPaceSecondsPerMile: number | null; tempoPaceSecondsPerMile: number | null }
): EffortTier {
  const { easyPaceSecondsPerMile: easy, tempoPaceSecondsPerMile: tempo } = planPaces;
  if (easy != null && tempo != null && easy > tempo) {
    const hardThreshold = tempo + (easy - tempo) * 0.5;
    if (run.avgPaceSecondsPerMile <= hardThreshold) {
      return "HARD";
    }
  } else if (tempo != null && run.avgPaceSecondsPerMile <= tempo) {
    return "HARD";
  }
  if (run.durationSeconds >= LONG_EFFORT_MINUTES * 60) {
    return "HARD";
  }
  return "EASY";
}
