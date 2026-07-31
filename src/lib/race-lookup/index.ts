import { searchRunSignupRaces } from "./runsignup";
import { searchTrailRaceViaWebSearch } from "./web-search-fallback";
import type { RaceLookupQuery, RaceLookupResult } from "./types";

/**
 * Runs both sources concurrently and always includes the web-search result
 * when one's found, rather than only falling back to it when RunSignup
 * returns zero results. RunSignup's name search has no relevance ranking,
 * so a query like "Boston Marathon" returns plenty of same-named local
 * qualifier races (e.g. "Boston or Bust Marathon") without ever returning
 * zero results -- the actual B.A.A. Boston Marathon isn't on RunSignup at
 * all (major marathons run their own registration systems), so it would
 * never surface under the old zero-results-only fallback. A text-relevance
 * filter can't reliably fix this either: "Boston or Bust Marathon"
 * genuinely contains every query word. A general web search for the race
 * name is far more likely to surface the actual official page (search
 * engines rank by real-world authority; RunSignup's search does not), so
 * it's shown first, with RunSignup's listings (useful for smaller local
 * races that really are on RunSignup) alongside as other options. Either
 * source failing independently doesn't block the other from contributing
 * results.
 */
export async function lookupRace(query: RaceLookupQuery): Promise<RaceLookupResult[]> {
  const [runSignupResults, webResult] = await Promise.all([
    searchRunSignupRaces(query).catch(() => [] as RaceLookupResult[]),
    searchTrailRaceViaWebSearch(query).catch(() => null),
  ]);

  return webResult ? [webResult, ...runSignupResults] : runSignupResults;
}

export * from "./types";
