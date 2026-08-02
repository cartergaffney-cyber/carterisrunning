import { computeFitnessSnapshot } from "./index";
import { riegelPredictTime, REFERENCE_DISTANCE_MILES } from "@/lib/plan-generator";
import { addDays, today } from "@/lib/utils/date";

const COMPARISON_WINDOW_DAYS = 30;

// The 4 standard race distances this predicts for -- deliberately the same
// 4 Strava's own "Performance Predictions" feature shows, in miles.
export const PREDICTOR_DISTANCES = {
  FIVE_K: { label: "5K", miles: 3.10686 },
  TEN_K: { label: "10K", miles: 6.21371 },
  HALF_MARATHON: { label: "Half Marathon", miles: 13.10938 },
  MARATHON: { label: "Marathon", miles: 26.21875 },
} as const;

export type PredictorDistanceKey = keyof typeof PREDICTOR_DISTANCES;

export interface DistancePrediction {
  key: PredictorDistanceKey;
  label: string;
  distanceMiles: number;
  predictedSeconds: number;
  paceSecondsPerMile: number;
  /** Positive = faster (improved) than 30 days ago; null if there's no comparable data from back then. */
  improvedBySecondsVsMonthAgo: number | null;
}

export interface PerformancePredictions {
  windowWeeks: number;
  bestRecentEffortDate: Date | null;
  predictions: DistancePrediction[];
}

function projectAll(referencePaceSecondsPerMile: number): Record<PredictorDistanceKey, { seconds: number; pace: number }> {
  const referenceTimeSeconds = referencePaceSecondsPerMile * REFERENCE_DISTANCE_MILES;
  const result = {} as Record<PredictorDistanceKey, { seconds: number; pace: number }>;
  for (const key of Object.keys(PREDICTOR_DISTANCES) as PredictorDistanceKey[]) {
    const miles = PREDICTOR_DISTANCES[key].miles;
    const seconds = riegelPredictTime(referenceTimeSeconds, REFERENCE_DISTANCE_MILES, miles);
    result[key] = { seconds, pace: seconds / miles };
  }
  return result;
}

/**
 * Projects the runner's recent best effort to all 4 standard race
 * distances via Riegel (same math the plan generator uses to derive an
 * implicit goal pace from fitness -- see goal-pace.ts), plus how each has
 * moved over the last 30 days. Returns null when there's no recent timed
 * effort to project from, same "no data yet" contract as the rest of the
 * fitness-assessment module.
 */
export async function computePerformancePredictions(userId: string): Promise<PerformancePredictions | null> {
  const current = await computeFitnessSnapshot(userId);
  if (!current.riegelEstimatedPaceSecondsPerMile) return null;

  const monthAgo = await computeFitnessSnapshot(userId, current.windowWeeks, addDays(today(), -COMPARISON_WINDOW_DAYS));

  const currentProjections = projectAll(current.riegelEstimatedPaceSecondsPerMile);
  const monthAgoProjections = monthAgo.riegelEstimatedPaceSecondsPerMile
    ? projectAll(monthAgo.riegelEstimatedPaceSecondsPerMile)
    : null;

  const predictions: DistancePrediction[] = (Object.keys(PREDICTOR_DISTANCES) as PredictorDistanceKey[]).map((key) => {
    const { seconds, pace } = currentProjections[key];
    const before = monthAgoProjections?.[key]?.seconds ?? null;
    return {
      key,
      label: PREDICTOR_DISTANCES[key].label,
      distanceMiles: PREDICTOR_DISTANCES[key].miles,
      predictedSeconds: Math.round(seconds),
      paceSecondsPerMile: Math.round(pace),
      improvedBySecondsVsMonthAgo: before != null ? Math.round(before - seconds) : null,
    };
  });

  return {
    windowWeeks: current.windowWeeks,
    bestRecentEffortDate: current.bestRecentEffortDate,
    predictions,
  };
}
