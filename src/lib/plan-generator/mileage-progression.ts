import { PhaseWeek, PlanTemplate } from "./types";

const WEEKLY_GROWTH_RATE = 1.1; // the ~10% rule

/**
 * Computes each week's target mileage, aligned index-for-index with the
 * given phase schedule. BASE/BUILD/PEAK weeks grow ~10% off the previous
 * *non-step-back* week's trajectory, capped at maxMileageMultiplier times
 * the runner's starting mileage — once that cap is hit, non-step-back weeks
 * plateau there rather than compounding indefinitely, so a multi-month plan
 * produces a realistic ramp-plateau-cutback wave instead of runaway
 * exponential growth. Step-back weeks reduce off the (possibly capped)
 * trajectory, and growth resumes toward the cap afterward. TAPER weeks are
 * derived from the runner's own organic peak (the highest mileage actually
 * reached) scaled by the template's taperPct curve — never a hardcoded
 * generic target, since the only fitness signal available here is the
 * runner's own starting mileage.
 */
export function computeWeeklyMileage(
  phaseSchedule: PhaseWeek[],
  currentWeeklyMileageMiles: number,
  template: PlanTemplate
): number[] {
  const weeklyMileages: number[] = new Array(phaseSchedule.length);
  const peakCap = currentWeeklyMileageMiles * template.maxMileageMultiplier;

  let trajectory = currentWeeklyMileageMiles;
  let lastNonStepBack = currentWeeklyMileageMiles;
  let peak = currentWeeklyMileageMiles;

  phaseSchedule.forEach((week, i) => {
    if (week.phase === "TAPER") {
      weeklyMileages[i] = 0; // filled in the second pass below
      return;
    }

    if (week.isStepBack) {
      trajectory = lastNonStepBack * (1 - template.stepBackReductionPct);
    } else {
      trajectory = Math.min(lastNonStepBack * WEEKLY_GROWTH_RATE, peakCap);
      lastNonStepBack = trajectory;
    }

    peak = Math.max(peak, trajectory);
    weeklyMileages[i] = trajectory;
  });

  const taperWeekIndices = phaseSchedule
    .map((week, i) => (week.phase === "TAPER" ? i : -1))
    .filter((i) => i !== -1);

  taperWeekIndices.forEach((weekIndex, taperPosition) => {
    const pct = template.taperPct[taperPosition] ?? template.taperPct[template.taperPct.length - 1];
    weeklyMileages[weekIndex] = peak * pct;
  });

  return weeklyMileages;
}
