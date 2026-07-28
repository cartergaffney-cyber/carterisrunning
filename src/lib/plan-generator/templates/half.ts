import { PlanTemplate } from "../types";

// Half marathon: balanced endurance + tempo build, moderate taper.
export const halfTemplate: PlanTemplate = {
  category: "HALF",
  minWeeks: 10,
  maxWeeks: 16,
  minTaperWeeks: 2,
  phaseSplit: { BASE: 0.35, BUILD: 0.35, PEAK: 0.15, TAPER: 0.15 },
  stepBackCadence: 4,
  stepBackReductionPct: 0.2,
  maxMileageMultiplier: 1.6,
  longRunShare: 0.3,
  maxLongRunMiles: 14,
  taperPct: [0.8, 0.65, 0.5],
  isUltra: false,
  weeklyPattern: {
    BASE: ["REST", "EASY", "TEMPO", "EASY", "REST", "LONG_RUN", "EASY"],
    BUILD: ["REST", "INTERVAL", "EASY", "TEMPO", "REST", "LONG_RUN", "EASY"],
    PEAK: ["REST", "INTERVAL", "EASY", "TEMPO", "REST", "LONG_RUN", "EASY"],
    TAPER: ["REST", "EASY", "EASY", "REST", "REST", "LONG_RUN", "REST"],
  },
};
