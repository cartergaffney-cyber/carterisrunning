export type ComparisonStatus = "ON_TARGET" | "TOO_HARD" | "TOO_EASY";

export interface WorkoutData {
  id: string;
  date: Date;
  workoutType: string;
  description: string;
  completed: boolean;
  missed: boolean;
  targetDistanceMiles: number | null;
  runId: string | null;
  actualDistanceMiles: number | null;
  actualDurationSeconds: number | null;
  actualPaceSecondsPerMile: number | null;
  comparisonStatus: ComparisonStatus | null;
  coachCommentary: string | null;
  adaptationReason: string | null;
  clubSuggestionReason: string | null;
  routeStatus: string | null;
  routeFileName: string | null;
}

export interface WeekData {
  weekNumber: number;
  phase: string;
  isStepBack: boolean;
  workouts: WorkoutData[];
}
