import { prisma } from "@/lib/db";
import { addDays } from "@/lib/utils/date";

// Grounded in the 2025 Aarhus University / Garmin-RunSafe Running Health
// Study (5,205 runners, 87 countries, 588k sessions) -- see KNOWLEDGE.md
// Section 3. That study found single-session distance spikes relative to a
// runner's own trailing 30-day longest run, not weekly mileage change or
// ACWR, was the strongest predictor of sudden-onset running injury:
// 10-30% longer => +64% injury risk, 30-100% => +52%, 100%+ => +128%.
// This module is this app's implementation of that specific, well-evidenced
// signal -- deliberately in place of a generic ACWR calculation, since the
// same study found ACWR had little predictive value once this metric was
// accounted for.
const WINDOW_DAYS = 30;
const ELEVATED_RISK_RATIO = 1.3; // >30% longer than 30-day longest
const HIGH_RISK_RATIO = 2.0; // >100% longer

export type SpikeRiskLevel = "NONE" | "ELEVATED" | "HIGH";

export interface SpikeRiskResult {
  level: SpikeRiskLevel;
  candidateDistanceMiles: number;
  trailingLongestMiles: number;
  ratio: number;
}

/**
 * The runner's own longest completed run in the trailing 30 days, excluding
 * the run/workout currently being evaluated (so a long run can't be
 * compared against itself when grading same-day).
 */
export async function getTrailingLongestRunMiles(
  userId: string,
  asOfDate: Date,
  excludeRunId?: string
): Promise<number | null> {
  const windowStart = addDays(asOfDate, -WINDOW_DAYS);

  const runs = await prisma.run.findMany({
    where: {
      userId,
      date: { gte: windowStart, lt: asOfDate },
      ...(excludeRunId ? { id: { not: excludeRunId } } : {}),
    },
    select: { distanceMiles: true },
    orderBy: { distanceMiles: "desc" },
    take: 1,
  });

  return runs[0]?.distanceMiles ?? null;
}

/**
 * Compares a candidate distance (a completed run, or a future planned
 * target being considered) against the runner's trailing 30-day longest
 * run. Returns NONE when there's no baseline yet (can't assess spike risk
 * for a runner's very first long efforts) or the candidate doesn't exceed
 * it meaningfully.
 */
export function assessSpikeRisk(candidateDistanceMiles: number, trailingLongestMiles: number | null): SpikeRiskResult {
  if (!trailingLongestMiles || trailingLongestMiles <= 0) {
    return { level: "NONE", candidateDistanceMiles, trailingLongestMiles: trailingLongestMiles ?? 0, ratio: 1 };
  }

  const ratio = candidateDistanceMiles / trailingLongestMiles;
  const level: SpikeRiskLevel = ratio >= HIGH_RISK_RATIO ? "HIGH" : ratio >= ELEVATED_RISK_RATIO ? "ELEVATED" : "NONE";

  return { level, candidateDistanceMiles, trailingLongestMiles, ratio };
}

/**
 * The largest distance that would stay just inside the "safe" band relative
 * to the runner's trailing 30-day longest run -- used to cap how far a
 * future long run's target can grow (e.g. during an "ahead of plan"
 * recalibration) so the plan itself never manufactures spike risk.
 */
export function maxSafeDistance(trailingLongestMiles: number | null): number | null {
  if (!trailingLongestMiles || trailingLongestMiles <= 0) return null;
  return trailingLongestMiles * ELEVATED_RISK_RATIO;
}
