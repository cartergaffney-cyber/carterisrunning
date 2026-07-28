export interface BestEffort {
  distanceMiles: number;
  seconds: number;
  date: Date;
}

// Runs shorter than this are excluded -- too noisy to represent a genuine
// effort (warm-up jogs, strides, etc).
const MIN_EFFORT_DISTANCE_MILES = 2;

/** Picks the run with the fastest pace among runs of at least MIN_EFFORT_DISTANCE_MILES. */
export function findBestRecentEffort(
  runs: { date: Date; distanceMiles: number; durationSeconds: number }[]
): BestEffort | null {
  const eligible = runs.filter((r) => r.distanceMiles >= MIN_EFFORT_DISTANCE_MILES);
  if (eligible.length === 0) return null;

  const best = eligible.reduce((fastest, run) => {
    const pace = run.durationSeconds / run.distanceMiles;
    const fastestPace = fastest.durationSeconds / fastest.distanceMiles;
    return pace < fastestPace ? run : fastest;
  });

  return { distanceMiles: best.distanceMiles, seconds: best.durationSeconds, date: best.date };
}
