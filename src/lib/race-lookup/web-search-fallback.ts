import { searchWeb, SearchNotConfiguredError } from "@/lib/search/search-client";
import { fetchPageText } from "@/lib/http/fetch-page-text";
import { parseCoursePage } from "./parse-course-page";
import type { RaceLookupQuery, RaceLookupResult } from "./types";

/**
 * Best-effort fallback for races with no RunSignup listing (typically
 * trail/ultra races). Searches the web for the official race page, fetches
 * it, and parses whatever distance/elevation/terrain info can be found.
 * Returns null (not an error) if no search provider is configured, or if
 * nothing usable turns up — the confirm form is where gaps get filled in.
 */
export async function searchTrailRaceViaWebSearch(
  query: RaceLookupQuery
): Promise<RaceLookupResult | null> {
  const searchQuery = [query.name, query.city, query.state, "race", "results"]
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
      name: query.name,
      raceDate: null,
      city: query.city,
      state: query.state,
      distanceMeters: null,
      terrainType: "UNKNOWN",
      elevationGainMeters: null,
      sourceUrl: topResult.url,
    };
  }

  const parsed = parseCoursePage(page.text);

  return {
    source: "WEB_SEARCH",
    name: query.name,
    raceDate: null,
    city: query.city,
    state: query.state,
    distanceMeters: parsed.distanceMeters ?? null,
    terrainType: parsed.terrainType ?? "UNKNOWN",
    elevationGainMeters: parsed.elevationGainMeters ?? null,
    sourceUrl: topResult.url,
    raw: { title: page.title, snippet: topResult.snippet },
  };
}
