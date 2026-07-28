import { prisma } from "@/lib/db";
import { addDays, today } from "@/lib/utils/date";
import { riegelPredictPace, REFERENCE_DISTANCE_MILES } from "@/lib/plan-generator";
import { computeWeeklyMileageTrend, MileageTrendDirection } from "./mileage-trend";
import { findBestRecentEffort } from "./pace-estimate";
import { computeTerrainExposure } from "./terrain";

const DEFAULT_WINDOW_WEEKS = 12;

export interface FitnessSnapshotData {
  windowWeeks: number;
  avgWeeklyMileageMiles: number;
  mileageTrend: MileageTrendDirection;
  typicalEasyPaceSecondsPerMile: number | null;
  bestRecentEffortDistanceMiles: number | null;
  bestRecentEffortSeconds: number | null;
  bestRecentEffortDate: Date | null;
  riegelEstimatedPaceSecondsPerMile: number | null;
  roadMileageMiles: number;
  trailMileageMiles: number;
  avgElevationGainFeetPerMile: number | null;
}

export async function computeFitnessSnapshot(
  userId: string,
  windowWeeks = DEFAULT_WINDOW_WEEKS
): Promise<FitnessSnapshotData> {
  const windowStart = addDays(today(), -windowWeeks * 7);

  const runs = await prisma.run.findMany({
    where: { userId, date: { gte: windowStart } },
    select: {
      date: true,
      distanceMiles: true,
      durationSeconds: true,
      elevationGainFeet: true,
      sportType: true,
    },
  });

  const { avgWeeklyMileageMiles, trend } = computeWeeklyMileageTrend(runs, windowWeeks);
  const bestEffort = findBestRecentEffort(runs);
  const terrain = computeTerrainExposure(runs);

  const totalMiles = runs.reduce((sum, r) => sum + r.distanceMiles, 0);
  const totalSeconds = runs.reduce((sum, r) => sum + r.durationSeconds, 0);
  const typicalEasyPaceSecondsPerMile = totalMiles > 0 ? Math.round(totalSeconds / totalMiles) : null;

  const riegelEstimatedPaceSecondsPerMile = bestEffort
    ? Math.round(riegelPredictPace(bestEffort.seconds, bestEffort.distanceMiles, REFERENCE_DISTANCE_MILES))
    : null;

  return {
    windowWeeks,
    avgWeeklyMileageMiles,
    mileageTrend: trend,
    typicalEasyPaceSecondsPerMile,
    bestRecentEffortDistanceMiles: bestEffort?.distanceMiles ?? null,
    bestRecentEffortSeconds: bestEffort?.seconds ?? null,
    bestRecentEffortDate: bestEffort?.date ?? null,
    riegelEstimatedPaceSecondsPerMile,
    roadMileageMiles: terrain.roadMileageMiles,
    trailMileageMiles: terrain.trailMileageMiles,
    avgElevationGainFeetPerMile: terrain.avgElevationGainFeetPerMile,
  };
}

export async function persistFitnessSnapshot(userId: string, data: FitnessSnapshotData) {
  return prisma.fitnessSnapshot.create({
    data: {
      userId,
      windowWeeks: data.windowWeeks,
      avgWeeklyMileageMiles: data.avgWeeklyMileageMiles,
      mileageTrend: data.mileageTrend,
      typicalEasyPaceSecondsPerMile: data.typicalEasyPaceSecondsPerMile,
      bestRecentEffortDistanceMiles: data.bestRecentEffortDistanceMiles,
      bestRecentEffortSeconds: data.bestRecentEffortSeconds,
      bestRecentEffortDate: data.bestRecentEffortDate,
      riegelEstimatedPaceSecondsPerMile: data.riegelEstimatedPaceSecondsPerMile,
      roadMileageMiles: data.roadMileageMiles,
      trailMileageMiles: data.trailMileageMiles,
      avgElevationGainFeetPerMile: data.avgElevationGainFeetPerMile,
    },
  });
}
