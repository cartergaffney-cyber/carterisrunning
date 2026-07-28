export interface TerrainExposure {
  roadMileageMiles: number;
  trailMileageMiles: number;
  avgElevationGainFeetPerMile: number | null;
}

/** Road/trail split (via Strava's sport_type, "Run" defaults to road) and elevation gain per mile as a terrain-difficulty proxy. */
export function computeTerrainExposure(
  runs: { distanceMiles: number; elevationGainFeet: number | null; sportType: string | null }[]
): TerrainExposure {
  let roadMileageMiles = 0;
  let trailMileageMiles = 0;
  let totalElevationFeet = 0;
  let totalElevationMiles = 0;

  for (const run of runs) {
    if (run.sportType === "TrailRun") {
      trailMileageMiles += run.distanceMiles;
    } else {
      roadMileageMiles += run.distanceMiles;
    }

    if (run.elevationGainFeet != null) {
      totalElevationFeet += run.elevationGainFeet;
      totalElevationMiles += run.distanceMiles;
    }
  }

  return {
    roadMileageMiles,
    trailMileageMiles,
    avgElevationGainFeetPerMile: totalElevationMiles > 0 ? totalElevationFeet / totalElevationMiles : null,
  };
}
