import { searchWeb, SearchNotConfiguredError } from "@/lib/search/search-client";
import { fetchPageText } from "@/lib/http/fetch-page-text";
import { parseCoursePage } from "./parse-course-page";
import { inferDistanceMetersFromName } from "./distance-mapping";
import type { RaceLookupQuery, RaceLookupResult } from "./types";

/**
 * Best-effort fallback for races with no RunSignup listing -- either
 * trail/ultra races that were never on RunSignup, or, just as commonly,
 * major races (Boston, NYC, Chicago, ...) that run their own registration
 * systems and simply aren't on RunSignup either. Searches the web for the
 * official race page, fetches it, and parses whatever distance/elevation/
 * terrain info can be found. Returns null (not an error) if no search
 * provider is configured, or if nothing usable turns up — the confirm form
 * is where gaps get filled in.
 *
 * Race date is deliberately never guessed from page text here, even though
 * it's the field users most want auto-filled: a race's own marketing page
 * is often full of OTHER dates (news posts, past-year results, press
 * releases) that a generic date regex could easily grab instead of the
 * actual next race day, and getting the race date wrong silently corrupts
 * the whole plan built from it (every week, phase, and taper date derives
 * from it). Distance is a safer bet -- see inferDistanceMetersFromName --
 * since standard race naming ("X Marathon") is a reliable, low-ambiguity
 * signal in a way free-text dates are not.
 */
export async function searchTrailRaceViaWebSearch(
  query: RaceLookupQuery
): Promise<RaceLookupResult | null> {
  // "official race info" (not "results") steers the search toward the
  // race's own info/registration page rather than a historical results
  // archive -- for "Boston Marathon race results" the top hit used to be
  // baa.org's results archive (28,506 historical finishers, no useful
  // course/date info); "official race info" surfaces baa.org's actual race
  // page instead, verified against several real searches.
  const searchQuery = [query.name, query.city, query.state, "official race info"]
    .filter(Boolean)
    .join(" ");

  let results;
  try {
    results = await searchWeb(searchQuery, 5);
  } catch (error) {
    if (error instanceof SearchNotConfiguredError) return null;
    throw error;
  }

  const topResult = results[0];
  if (!topResult) return null;

  const page = await fetchPageText(topResult.url);
  if (!page) {
    return {
      source: "WEB_SEARCH",
      name: topResult.title || query.name,
      raceDate: null,
      city: query.city,
      state: query.state,
      distanceMeters: inferDistanceMetersFromName(topResult.title || query.name),
      terrainType: "UNKNOWN",
      elevationGainMeters: null,
      sourceUrl: topResult.url,
    };
  }

  const parsed = parseCoursePage(page.text);
  // The fetched page's own <title> is the most authoritative name
  // available -- using the literal search query here (as this used to)
  // just echoes back whatever the user typed instead of naming the race
  // that was actually found.
  const name = page.title || topResult.title || query.name;

  return {
    source: "WEB_SEARCH",
    name,
    raceDate: null,
    city: query.city,
    state: query.state,
    distanceMeters: parsed.distanceMeters ?? inferDistanceMetersFromName(name) ?? inferDistanceMetersFromName(query.name),
    terrainType: parsed.terrainType ?? "UNKNOWN",
    elevationGainMeters: parsed.elevationGainMeters ?? null,
    sourceUrl: topResult.url,
    raw: { title: page.title, snippet: topResult.snippet },
  };
}
