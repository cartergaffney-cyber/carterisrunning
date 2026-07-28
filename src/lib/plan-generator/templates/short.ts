import { PlanTemplate } from "../types";

// 5K / 10K: speed and interval focused, minimal taper, shorter long run.
export const shortTemplate: PlanTemplate = {
  category: "SHORT",
  minWeeks: 6,
  maxWeeks: 12,
  minTaperWeeks: 1,
  phaseSplit: { BASE: 0.35, BUILD: 0.4, PEAK: 0.15, TAPER: 0.1 },
  stepBackCadence: 4,
  stepBackReductionPct: 0.22,
  maxMileageMultiplier: 1.5,
  longRunShare: 0.25,
  maxLongRunMiles: 10,
  taperPct: [0.75, 0.55],
  isUltra: false,
  weeklyPattern: {
    BASE: ["REST", "EASY", "INTERVAL", "EASY", "REST", "LONG_RUN", "EASY"],
    BUILD: ["REST", "INTERVAL", "TEMPO", "EASY", "REST", "LONG_RUN", "EASY"],
    PEAK: ["REST", "INTERVAL", "TEMPO", "EASY", "REST", "RACE_PACE", "EASY"],
    TAPER: ["REST", "EASY", "INTERVAL", "REST", "REST", "EASY", "REST"],
  },
};
