import { PlanTemplate } from "../types";

// Marathon: long base + build, real taper.
export const marathonTemplate: PlanTemplate = {
  category: "MARATHON",
  minWeeks: 16,
  maxWeeks: 20,
  minTaperWeeks: 2,
  phaseSplit: { BASE: 0.4, BUILD: 0.35, PEAK: 0.15, TAPER: 0.1 },
  stepBackCadence: 4,
  stepBackReductionPct: 0.2,
  maxMileageMultiplier: 1.8,
  longRunShare: 0.3,
  maxLongRunMiles: 20,
  taperPct: [0.75, 0.6, 0.4],
  isUltra: false,
  weeklyPattern: {
    BASE: ["REST", "EASY", "TEMPO", "EASY", "REST", "LONG_RUN", "EASY"],
    BUILD: ["REST", "INTERVAL", "EASY", "TEMPO", "REST", "LONG_RUN", "EASY"],
    PEAK: ["REST", "INTERVAL", "EASY", "TEMPO", "REST", "LONG_RUN", "EASY"],
    TAPER: ["REST", "EASY", "EASY", "REST", "REST", "LONG_RUN", "REST"],
  },
};
