import { searchRunSignupRaces } from "./runsignup";
import { searchTrailRaceViaWebSearch } from "./web-search-fallback";
import type { RaceLookupQuery, RaceLookupResult } from "./types";

export async function lookupRace(query: RaceLookupQuery): Promise<RaceLookupResult[]> {
  const runSignupResults = await searchRunSignupRaces(query);
  if (runSignupResults.length > 0) {
    return runSignupResults;
  }

  const fallback = await searchTrailRaceViaWebSearch(query);
  return fallback ? [fallback] : [];
}

export * from "./types";
