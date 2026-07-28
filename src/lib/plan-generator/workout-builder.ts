import { GeneratedWorkout, PhaseWeek, PlanTemplate, TrainingPaces, WorkoutType } from "./types";
import { addDays } from "../utils/date";
import { formatPaceSecondsPerMile } from "../utils/pace";

// Placeholder pace used to convert ultra long-run mileage into a
// time-on-feet duration when no goal-time/fitness-derived pace is
// available yet (e.g. a brand-new user with no Strava history and no
// goal time entered).
const ULTRA_DEFAULT_PACE_MIN_PER_MILE = 12;

const DAY_MILEAGE_WEIGHTS: Partial<Record<WorkoutType, number>> = {
  EASY: 1.0,
  TEMPO: 0.8,
  INTERVAL: 0.6,
  RACE_PACE: 0.7,
};

const PACE_BY_WORKOUT_TYPE: Partial<Record<WorkoutType, keyof TrainingPaces>> = {
  EASY: "easyPaceSecondsPerMile",
  TEMPO: "tempoPaceSecondsPerMile",
  INTERVAL: "intervalPaceSecondsPerMile",
  RACE_PACE: "racePaceSecondsPerMile",
  LONG_RUN: "longRunPaceSecondsPerMile",
};

const BACK_TO_BACK_SATURDAY_SHARE = 0.6;
const BACK_TO_BACK_SUNDAY_SHARE = 0.4;

function milesToDurationMinutes(miles: number, longRunPaceSecondsPerMile?: number): number {
  const paceMinPerMile = longRunPaceSecondsPerMile ? longRunPaceSecondsPerMile / 60 : ULTRA_DEFAULT_PACE_MIN_PER_MILE;
  return Math.round((miles * paceMinPerMile) / 5) * 5;
}

function describeWorkout(
  workoutType: WorkoutType,
  distanceMiles: number | undefined,
  durationMinutes: number | undefined,
  paceSecondsPerMile: number | undefined
): string {
  const paceSuffix = paceSecondsPerMile ? ` @ ${formatPaceSecondsPerMile(paceSecondsPerMile)}` : "";

  switch (workoutType) {
    case "REST":
      return "Rest day.";
    case "EASY":
      return `${distanceMiles?.toFixed(1)} mi easy${paceSuffix}.`;
    case "TEMPO":
      return `${distanceMiles?.toFixed(1)} mi tempo run${paceSuffix}.`;
    case "INTERVAL":
      return `Interval workout: ~${distanceMiles?.toFixed(1)} mi total incl. warm-up/cool-down${paceSuffix}.`;
    case "RACE_PACE":
      return `${distanceMiles?.toFixed(1)} mi at goal race pace${paceSuffix}.`;
    case "LONG_RUN":
      return durationMinutes
        ? `Long run: ~${durationMinutes} min time-on-feet.`
        : `${distanceMiles?.toFixed(1)} mi long run${paceSuffix}.`;
    case "BACK_TO_BACK_LONG":
      return `Back-to-back long run: ~${durationMinutes} min time-on-feet.`;
    case "CROSS_TRAIN":
      return "Cross-train (bike/swim/strength), 30-45 min.";
    case "RACE":
      return "Race day!";
  }
}

export function buildWeekWorkouts(
  week: PhaseWeek & { targetWeeklyMileage: number },
  template: PlanTemplate,
  weekStartDate: Date,
  paces?: TrainingPaces | null
): GeneratedWorkout[] {
  const pattern = [...template.weeklyPattern[week.phase]];

  const saturdayIndex = 5;
  const sundayIndex = 6;

  if (week.isBackToBackWeek) {
    pattern[saturdayIndex] = "BACK_TO_BACK_LONG";
    pattern[sundayIndex] = "BACK_TO_BACK_LONG";
  }

  const longRunIndices = pattern
    .map((type, i) => (type === "LONG_RUN" ? i : -1))
    .filter((i) => i !== -1);
  const backToBackIndices = pattern
    .map((type, i) => (type === "BACK_TO_BACK_LONG" ? i : -1))
    .filter((i) => i !== -1);

  let longRunMilesByDay: Record<number, number> = {};
  let totalLongRunShareMiles = 0;

  if (backToBackIndices.length > 0) {
    const combinedShare = template.longRunShare * (template.backToBackShareMultiplier ?? 1);
    const combinedMiles = week.targetWeeklyMileage * combinedShare;
    longRunMilesByDay[saturdayIndex] = combinedMiles * BACK_TO_BACK_SATURDAY_SHARE;
    longRunMilesByDay[sundayIndex] = combinedMiles * BACK_TO_BACK_SUNDAY_SHARE;
    totalLongRunShareMiles = combinedMiles;
  } else if (longRunIndices.length > 0) {
    let longRunMiles = week.targetWeeklyMileage * template.longRunShare;
    const capApplies = template.maxLongRunMiles !== undefined && !(template.isUltra && week.phase === "PEAK");
    if (capApplies) {
      longRunMiles = Math.min(longRunMiles, template.maxLongRunMiles!);
    }
    longRunMilesByDay[longRunIndices[0]] = longRunMiles;
    totalLongRunShareMiles = longRunMiles;
  }

  const remainingMileage = Math.max(0, week.targetWeeklyMileage - totalLongRunShareMiles);
  const weightedDayIndices = pattern
    .map((type, i) => ({ i, weight: DAY_MILEAGE_WEIGHTS[type] }))
    .filter((d): d is { i: number; weight: number } => d.weight !== undefined);
  const totalWeight = weightedDayIndices.reduce((sum, d) => sum + d.weight, 0);

  const otherMilesByDay: Record<number, number> = {};
  if (totalWeight > 0) {
    weightedDayIndices.forEach(({ i, weight }) => {
      otherMilesByDay[i] = remainingMileage * (weight / totalWeight);
    });
  }

  return pattern.map((workoutType, i) => {
    const date = addDays(weekStartDate, i);
    const paceKey = PACE_BY_WORKOUT_TYPE[workoutType];
    const paceSecondsPerMile = paceKey && paces ? (paces[paceKey] as number) : undefined;

    if (workoutType === "REST" || workoutType === "CROSS_TRAIN") {
      return {
        dayOffset: i,
        date,
        workoutType,
        description: describeWorkout(workoutType, undefined, undefined, undefined),
      };
    }

    if (workoutType === "LONG_RUN" || workoutType === "BACK_TO_BACK_LONG") {
      const miles = longRunMilesByDay[i] ?? 0;
      if (template.isUltra) {
        const durationMinutes = milesToDurationMinutes(miles, paces?.longRunPaceSecondsPerMile);
        return {
          dayOffset: i,
          date,
          workoutType,
          targetDurationMinutes: durationMinutes,
          description: describeWorkout(workoutType, undefined, durationMinutes, undefined),
        };
      }
      return {
        dayOffset: i,
        date,
        workoutType,
        targetDistanceMiles: Math.round(miles * 10) / 10,
        targetPaceSecondsPerMile: paceSecondsPerMile,
        description: describeWorkout(workoutType, miles, undefined, paceSecondsPerMile),
      };
    }

    const miles = otherMilesByDay[i] ?? 0;
    return {
      dayOffset: i,
      date,
      workoutType,
      targetDistanceMiles: Math.round(miles * 10) / 10,
      targetPaceSecondsPerMile: paceSecondsPerMile,
      description: describeWorkout(workoutType, miles, undefined, paceSecondsPerMile),
    };
  });
}
