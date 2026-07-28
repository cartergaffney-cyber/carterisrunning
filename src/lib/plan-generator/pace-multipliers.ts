import { DistanceCategory } from "./types";

export interface PaceMultiplierSet {
  easy: number;
  tempo: number;
  interval: number;
  long: number;
  race: number;
}

/**
 * Hand-tuned approximation of training paces relative to race pace -- not a
 * physiological model (no full VDOT lookup table). Values below 1.0 run
 * faster than goal race pace (appropriate for short, sharp interval work
 * when the goal race is long). Treat as tunable, not authoritative.
 */
export const PACE_MULTIPLIERS: Record<DistanceCategory, PaceMultiplierSet> = {
  SHORT: { easy: 1.28, tempo: 1.1, interval: 0.97, long: 1.3, race: 1.0 },
  HALF: { easy: 1.2, tempo: 1.06, interval: 0.93, long: 1.15, race: 1.0 },
  MARATHON: { easy: 1.15, tempo: 1.04, interval: 0.9, long: 1.08, race: 1.0 },
  ULTRA: { easy: 1.2, tempo: 1.08, interval: 0.92, long: 1.1, race: 1.0 },
  HUNDRED: { easy: 1.22, tempo: 1.1, interval: 0.94, long: 1.12, race: 1.0 },
};
