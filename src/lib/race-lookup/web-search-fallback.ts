import { searchWeb, SearchNotConfiguredError } from "@/lib/search/search-client";
import { fetchPageText } from "@/lib/http/fetch-page-text";
import { parseCoursePage, parseDateFromText } from "./parse-course-page";
import { inferDistanceMetersFromName } from "./distance-mapping";
import type { RaceLookupQuery, RaceLookupResult } from "./types";

/**
 * Best-effort fallback for races with no RunSignup listing -- either
 * trail/ultra races that were never on RunSignup, or, just as commonly,
 * major races (Boston, NYC, Chicago, ...) that run their own registration
 * systems and simply aren't on RunSignup either. Searches the web for the
 * official race page, fetches it, and parses whatever distance/elevation/
 * terrain/date info can be found. Returns null (not an error) if no search
 * provider is configured, or if nothing usable turns up — the confirm form
 * is where gaps get filled in.
 *
 * Race date is a best-effort parse (see parseDateFromText) -- a page can
 * mention other dates (past results, news posts) that a generic date regex
 * could latch onto instead of the actual next race day. Surfaced as a
 * pre-filled, editable suggestion rather than skipped, on the reasoning
 * that a wrong pre-fill the user can see and correct beats an empty field
 * they might not think to fill in at all.
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
      raceDate: parseDateFromText(`${topResult.title} ${topResult.snippet}`),
      city: query.city,
      state: query.state,
      distanceMeters: inferDistanceMetersFromName(topResult.title || query.name),
      terrainType: "ROAD",
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
    raceDate: parseDateFromText(page.text) ?? parseDateFromText(`${topResult.title} ${topResult.snippet}`),
    city: query.city,
    state: query.state,
    distanceMeters: parsed.distanceMeters ?? inferDistanceMetersFromName(name) ?? inferDistanceMetersFromName(query.name),
    terrainType: parsed.terrainType ?? "ROAD",
    elevationGainMeters: parsed.elevationGainMeters ?? null,
    sourceUrl: topResult.url,
    raw: { title: page.title, snippet: topResult.snippet },
  };
}
