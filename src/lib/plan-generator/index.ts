import { GeneratePlanInput, GeneratedPlan, GeneratedWeek } from "./types";
import { getTemplate, DISTANCE_MILES, DISTANCE_LABELS } from "./templates";
import { computePhaseSchedule } from "./phases";
import { computeWeeklyMileage } from "./mileage-progression";
import { buildWeekWorkouts } from "./workout-builder";
import { deriveTrainingPaces } from "./goal-pace";
import { addDays, diffInDays, mondayOfWeek, weeksBetween } from "../utils/date";

/**
 * Pure, DB-free plan generator. The schedule always ends exactly on race
 * day, computed backward from raceDate rather than forward from startDate:
 * if the template's maxWeeks caps the structure below the raw weeks
 * available, the plan simply starts later than startDate (leaving room for
 * unstructured base mileage beforehand) rather than leaving a gap before
 * the race.
 */
export function generatePlan(input: GeneratePlanInput): GeneratedPlan {
  const template = getTemplate(input.raceDistance);
  const warnings: string[] = [];

  const startingWeeklyMileage = input.currentWeeklyMileageMiles ?? input.fitnessSnapshot?.avgWeeklyMileageMiles;
  if (startingWeeklyMileage === undefined) {
    throw new Error(
      "generatePlan requires either currentWeeklyMileageMiles or a fitnessSnapshot with avgWeeklyMileageMiles"
    );
  }

  const raceDistanceMiles = DISTANCE_MILES[input.raceDistance];
  const paces = deriveTrainingPaces({
    raceDistance: input.raceDistance,
    raceDistanceMiles,
    goalTimeSeconds: input.goalTimeSeconds,
    fitnessSnapshot: input.fitnessSnapshot,
  });

  const rawWeeks = weeksBetween(input.startDate, input.raceDate);
  const totalWeeks = Math.max(1, Math.min(rawWeeks, template.maxWeeks));

  if (rawWeeks < template.minWeeks) {
    warnings.push(
      `Only ${rawWeeks} week(s) until race day — below the recommended minimum of ${template.minWeeks} weeks for a ${template.category} plan. Phases have been compressed.`
    );
  }
  if (rawWeeks > template.maxWeeks) {
    warnings.push(
      `${rawWeeks} weeks available; the structured plan is capped at ${template.maxWeeks} weeks and will start later than your chosen start date.`
    );
  }
  if (paces?.feasibilityNote) {
    warnings.push(paces.feasibilityNote);
  }

  const phaseSchedule = computePhaseSchedule(totalWeeks, template);
  const weeklyMileages = computeWeeklyMileage(phaseSchedule, startingWeeklyMileage, template);

  // Every week starts on a real Monday: the schedule works backward from the
  // Monday of race week, so weekday patterns (e.g. "long run on Saturday")
  // land on actual Saturdays rather than an arbitrary offset from raceDate.
  const raceWeekMonday = mondayOfWeek(input.raceDate);
  const scheduleStartDate = addDays(raceWeekMonday, -(totalWeeks - 1) * 7);
  const raceDayOffset = diffInDays(raceWeekMonday, input.raceDate);

  const weeks: GeneratedWeek[] = phaseSchedule.map((week, i) => {
    const weekStartDate = addDays(scheduleStartDate, i * 7);
    const targetWeeklyMileage = weeklyMileages[i];
    const workouts = buildWeekWorkouts({ ...week, targetWeeklyMileage }, template, weekStartDate, paces);
    return {
      weekNumber: week.weekNumber,
      phase: week.phase,
      isStepBack: week.isStepBack,
      isBackToBackWeek: week.isBackToBackWeek,
      targetWeeklyMileage,
      workouts,
    };
  });

  const lastWeek = weeks[weeks.length - 1];
  lastWeek.workouts[raceDayOffset] = {
    dayOffset: raceDayOffset,
    date: input.raceDate,
    workoutType: "RACE",
    targetDistanceMiles: raceDistanceMiles,
    targetPaceSecondsPerMile: paces?.racePaceSecondsPerMile,
    description: `Race day! ${DISTANCE_LABELS[input.raceDistance]}.`,
  };

  return { totalWeeks, weeks, warnings, paces };
}

export * from "./types";
export { getDistanceCategory, getTemplate, DISTANCE_MILES, DISTANCE_LABELS } from "./templates";
export { deriveTrainingPaces, REFERENCE_DISTANCE_MILES } from "./goal-pace";
export { riegelPredictTime, riegelPredictPace } from "./riegel";
