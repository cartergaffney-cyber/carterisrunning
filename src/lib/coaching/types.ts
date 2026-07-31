export type ComparisonStatus = "ON_TARGET" | "TOO_HARD" | "TOO_EASY";

export type EffortTier = "HARD" | "EASY";

export interface RunComparison {
  status: ComparisonStatus;
  primarySignal: "pace" | "distance" | "duration";
  distanceRatio?: number;
  durationRatio?: number;
  paceDeltaSecondsPerMile?: number;
}
