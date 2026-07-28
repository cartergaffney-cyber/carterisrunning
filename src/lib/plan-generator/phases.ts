import { PhaseWeek, PlanTemplate } from "./types";

/**
 * Allocates a total week count across BASE/BUILD/BUILD/PEAK/TAPER using the
 * template's phaseSplit fractions, always preserving at least minTaperWeeks.
 * Any rounding remainder is absorbed by BUILD (per the plan's design note).
 * Also flags step-back weeks (every stepBackCadence-th non-taper week) and,
 * for ULTRA templates, back-to-back long-run weekends (every
 * backToBackCadence-th BUILD/PEAK week, skipping step-back weeks).
 */
export function computePhaseSchedule(totalWeeks: number, template: PlanTemplate): PhaseWeek[] {
  const taperWeeks = Math.min(
    totalWeeks,
    Math.max(template.minTaperWeeks, Math.round(totalWeeks * template.phaseSplit.TAPER))
  );
  const remaining = totalWeeks - taperWeeks;

  const nonTaperSplit = template.phaseSplit.BASE + template.phaseSplit.BUILD + template.phaseSplit.PEAK;
  const baseWeeks = Math.max(0, Math.round(remaining * (template.phaseSplit.BASE / nonTaperSplit)));
  const peakWeeks = Math.max(0, Math.round(remaining * (template.phaseSplit.PEAK / nonTaperSplit)));
  const buildWeeks = Math.max(0, remaining - baseWeeks - peakWeeks);

  const schedule: PhaseWeek[] = [];
  let weekNumber = 1;
  let nonTaperCounter = 0;
  let backToBackCounter = 0;

  const isBackToBackEligible = (isStepBack: boolean) =>
    template.isUltra && !!template.backToBackCadence && !isStepBack;

  for (let i = 0; i < baseWeeks; i++) {
    nonTaperCounter++;
    schedule.push({
      weekNumber: weekNumber++,
      phase: "BASE",
      isStepBack: nonTaperCounter % template.stepBackCadence === 0,
      isBackToBackWeek: false,
    });
  }

  for (let i = 0; i < buildWeeks; i++) {
    nonTaperCounter++;
    const isStepBack = nonTaperCounter % template.stepBackCadence === 0;
    let isBackToBackWeek = false;
    if (isBackToBackEligible(isStepBack)) {
      backToBackCounter++;
      isBackToBackWeek = backToBackCounter % template.backToBackCadence! === 0;
    }
    schedule.push({ weekNumber: weekNumber++, phase: "BUILD", isStepBack, isBackToBackWeek });
  }

  for (let i = 0; i < peakWeeks; i++) {
    nonTaperCounter++;
    const isLastNonTaperWeek = i === peakWeeks - 1;
    const isStepBack = !isLastNonTaperWeek && nonTaperCounter % template.stepBackCadence === 0;
    let isBackToBackWeek = false;
    if (isBackToBackEligible(isStepBack)) {
      backToBackCounter++;
      isBackToBackWeek = backToBackCounter % template.backToBackCadence! === 0;
    }
    schedule.push({ weekNumber: weekNumber++, phase: "PEAK", isStepBack, isBackToBackWeek });
  }

  for (let i = 0; i < taperWeeks; i++) {
    schedule.push({ weekNumber: weekNumber++, phase: "TAPER", isStepBack: false, isBackToBackWeek: false });
  }

  return schedule;
}
