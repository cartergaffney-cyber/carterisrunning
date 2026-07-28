export type RaceDistance =
  | "FIVE_K"
  | "TEN_K"
  | "HALF_MARATHON"
  | "MARATHON"
  | "FIFTY_K"
  | "FIFTY_MILE"
  | "HUNDRED_K"
  | "HUNDRED_MILE";

export type DistanceCategory = "SHORT" | "HALF" | "MARATHON" | "ULTRA" | "HUNDRED";

export type TrainingPhase = "BASE" | "BUILD" | "PEAK" | "TAPER";

export type WorkoutType =
  | "REST"
  | "EASY"
  | "LONG_RUN"
  | "TEMPO"
  | "INTERVAL"
  | "RACE_PACE"
  | "BACK_TO_BACK_LONG"
  | "CROSS_TRAIN"
  | "RACE";

export type PaceBasis = "GOAL_TIME" | "CURRENT_FITNESS" | "BLENDED";

export interface FitnessSnapshotInput {
  avgWeeklyMileageMiles: number;
  /** Riegel-normalized pace at a fixed reference distance (10K), for cross-distance comparison. */
  riegelEstimatedPaceSecondsPerMile: number | null;
}

export interface TrainingPaces {
  easyPaceSecondsPerMile: number;
  tempoPaceSecondsPerMile: number;
  intervalPaceSecondsPerMile: number;
  longRunPaceSecondsPerMile: number;
  racePaceSecondsPerMile: number;
  paceBasis: PaceBasis;
  feasibilityNote?: string;
}

export interface GeneratePlanInput {
  raceDistance: RaceDistance;
  raceDate: Date;
  startDate: Date;
  /** Optional when a fitnessSnapshot is supplied -- falls back to it, manual entry otherwise required. */
  currentWeeklyMileageMiles?: number;
  goalTimeSeconds?: number;
  fitnessSnapshot?: FitnessSnapshotInput | null;
}

export interface GeneratedWorkout {
  dayOffset: number; // 0 = Monday .. 6 = Sunday, relative to the week's start
  date: Date;
  workoutType: WorkoutType;
  targetDistanceMiles?: number;
  targetDurationMinutes?: number;
  targetPaceSecondsPerMile?: number;
  description: string;
}

export interface GeneratedWeek {
  weekNumber: number;
  phase: TrainingPhase;
  isStepBack: boolean;
  isBackToBackWeek: boolean;
  targetWeeklyMileage: number;
  workouts: GeneratedWorkout[];
}

export interface GeneratedPlan {
  totalWeeks: number;
  weeks: GeneratedWeek[];
  warnings: string[];
  paces: TrainingPaces | null;
}

export interface PhaseWeek {
  weekNumber: number;
  phase: TrainingPhase;
  isStepBack: boolean;
  isBackToBackWeek: boolean;
}

export type PhasePattern = Record<TrainingPhase, WorkoutType[]>; // each value has 7 entries, Mon..Sun

export interface PlanTemplate {
  category: DistanceCategory;
  minWeeks: number;
  maxWeeks: number;
  minTaperWeeks: number;
  phaseSplit: Record<TrainingPhase, number>; // fractions summing to ~1
  stepBackCadence: number;
  stepBackReductionPct: number;
  /** Caps peak weekly mileage at this multiple of the runner's starting
   * mileage, so growth plateaus into a sustainable wave (ramp, cutback,
   * ramp back to the cap) instead of compounding 10%/week indefinitely. */
  maxMileageMultiplier: number;
  longRunShare: number;
  maxLongRunMiles?: number; // ignored by ULTRA templates during PEAK
  taperPct: number[]; // ordered earliest-taper-week -> race week
  weeklyPattern: PhasePattern;
  isUltra: boolean;
  backToBackCadence?: number; // ULTRA only
  backToBackShareMultiplier?: number; // ULTRA only: combined Sat+Sun share of weekly mileage vs a single long run
}
