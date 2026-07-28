import { PlanTemplate } from "../types";

// 100K / 100 mile: a longer, more conservative build than the 50K/50-mile
// ULTRA template — more frequent back-to-back weekends (every other
// non-step-back week rather than every 3rd), a bigger combined weekend
// volume, and a 3-week taper rather than 2. Long runs are time-based, not
// distance-based — see ULTRA_DEFAULT_PACE_MIN_PER_MILE in workout-builder.ts.
export const hundredTemplate: PlanTemplate = {
  category: "HUNDRED",
  minWeeks: 24,
  maxWeeks: 30,
  minTaperWeeks: 3,
  phaseSplit: { BASE: 0.45, BUILD: 0.3, PEAK: 0.13, TAPER: 0.12 },
  stepBackCadence: 3,
  stepBackReductionPct: 0.25,
  maxMileageMultiplier: 2.2,
  longRunShare: 0.35,
  maxLongRunMiles: undefined,
  taperPct: [0.7, 0.55, 0.35],
  isUltra: true,
  backToBackCadence: 2,
  backToBackShareMultiplier: 1.8,
  weeklyPattern: {
    BASE: ["REST", "EASY", "EASY", "EASY", "REST", "LONG_RUN", "EASY"],
    BUILD: ["REST", "TEMPO", "EASY", "EASY", "REST", "LONG_RUN", "EASY"],
    PEAK: ["REST", "TEMPO", "EASY", "EASY", "REST", "LONG_RUN", "EASY"],
    TAPER: ["REST", "EASY", "EASY", "REST", "REST", "EASY", "REST"],
  },
};
