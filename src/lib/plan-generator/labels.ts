import type { WorkoutType } from "./types";

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  REST: "Rest",
  EASY: "Easy",
  LONG_RUN: "Long Run",
  TEMPO: "Tempo",
  INTERVAL: "Interval",
  RACE_PACE: "Race Pace",
  BACK_TO_BACK_LONG: "Back-to-Back",
  CROSS_TRAIN: "Cross-Train",
  RACE: "RACE DAY",
};
