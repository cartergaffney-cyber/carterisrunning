import { PlanTemplate } from "../types";

// 50K / 50 mile: long base-building, back-to-back long-run weekends,
// more frequent step-backs (faster fatigue accumulation at ultra volumes),
// longer taper. Long runs are time-based, not distance-based — see
// ULTRA_DEFAULT_PACE_MIN_PER_MILE in workout-builder.ts.
export const ultraTemplate: PlanTemplate = {
  category: "ULTRA",
  minWeeks: 20,
  maxWeeks: 26,
  minTaperWeeks: 2,
  phaseSplit: { BASE: 0.45, BUILD: 0.3, PEAK: 0.15, TAPER: 0.1 },
  stepBackCadence: 3,
  stepBackReductionPct: 0.25,
  maxMileageMultiplier: 2.0,
  longRunShare: 0.35,
  maxLongRunMiles: undefined,
  taperPct: [0.65, 0.45],
  isUltra: true,
  backToBackCadence: 3,
  backToBackShareMultiplier: 1.6,
  weeklyPattern: {
    BASE: ["REST", "EASY", "EASY", "EASY", "REST", "LONG_RUN", "EASY"],
    BUILD: ["REST", "TEMPO", "EASY", "EASY", "REST", "LONG_RUN", "EASY"],
    PEAK: ["REST", "TEMPO", "EASY", "EASY", "REST", "LONG_RUN", "EASY"],
    TAPER: ["REST", "EASY", "EASY", "REST", "REST", "EASY", "REST"],
  },
};
