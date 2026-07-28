import { prisma } from "@/lib/db";
import { searchWeb, SearchNotConfiguredError } from "@/lib/search/search-client";
import { fetchPageText } from "@/lib/http/fetch-page-text";
import { getMetroNicknames } from "./metro-nicknames";

export type ClubCandidateSource = "WEB_SEARCH" | "RUNNING_STORE" | "RRCA_DIRECTORY";

export interface ClubCandidate {
  name: string;
  websiteUrl: string;
  sourceQuery: string;
  discoverySource: ClubCandidateSource;
  rawText: string;
}

const MAX_CANDIDATES = 8;
const RESULTS_PER_QUERY = 3;

// Consistent with the earlier decision not to scrape social platforms or
// Strava's own public club pages for club data -- these show up in generic
// search results constantly (a club's Strava club page ranks well for its
// own name) and would otherwise silently reintroduce that declined data
// source through the search fallback.
const BLOCKED_DOMAINS = [
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "strava.com",
  "reddit.com",
];

function isBlockedDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return BLOCKED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return true; // an unparseable URL isn't safe to fetch either
  }
}

/**
 * Discovers candidate run clubs near the user's geocoded home location by
 * searching the web (city name + local metro nicknames, plus targeted
 * running-store and RRCA-directory queries) and fetching each candidate's
 * own website. Every query runs before the result list is capped, so a
 * nickname-only query isn't starved by an earlier query alone filling the
 * quota. Returns an empty array (not an error) when no search provider is
 * configured.
 */
export async function discoverClubs(userId: string): Promise<ClubCandidate[]> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.homeCity) {
    throw new Error("User has no geocoded home location");
  }

  const nicknames = getMetroNicknames(user.homeCity);
  const locationTerms = [user.homeCity, ...nicknames];

  const queries = [
    ...locationTerms.map((term) => `"${term}" running club schedule`),
    `running store community run near ${user.homeCity}`,
    `RRCA running club ${user.homeCity} ${user.homeState ?? ""}`.trim(),
  ];

  const seenUrls = new Set<string>();
  const candidates: ClubCandidate[] = [];

  for (const query of queries) {
    let results;
    try {
      results = await searchWeb(query, RESULTS_PER_QUERY);
    } catch (error) {
      if (error instanceof SearchNotConfiguredError) return [];
      throw error;
    }

    for (const result of results) {
      if (seenUrls.has(result.url) || isBlockedDomain(result.url)) continue;
      seenUrls.add(result.url);

      const page = await fetchPageText(result.url);
      if (!page) continue;

      const discoverySource: ClubCandidateSource = query.includes("running store")
        ? "RUNNING_STORE"
        : query.includes("RRCA")
          ? "RRCA_DIRECTORY"
          : "WEB_SEARCH";

      candidates.push({
        name: page.title || result.title,
        websiteUrl: result.url,
        sourceQuery: query,
        discoverySource,
        rawText: page.text,
      });
    }
  }

  return candidates.slice(0, MAX_CANDIDATES);
}
