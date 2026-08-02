import { prisma } from "@/lib/db";
import { searchWeb, SearchNotConfiguredError } from "@/lib/search/search-client";

// SerpApi's free tier is 250 searches/month, shared with the live
// race-lookup feature real users trigger -- keep this pass small so
// background enrichment never crowds out that quota.
const ENRICHMENT_BATCH_LIMIT = 15;

// Registration/listing aggregators, not a race's own site -- confirmed by
// spot-checking real enrichment results, several of which turned out to be
// exactly this (e.g. trisignup.com, marathonguide.com) rather than the
// race's own domain. A registration-platform link is legitimately useful
// as registrationUrl, but mislabeling it as the race's official
// websiteUrl would be wrong, so both are skipped rather than half-right.
const AGGREGATOR_HOSTS = [
  "findarace.com",
  "runsignup.com",
  "runguides.com",
  "active.com",
  "raceroster.com",
  "letsdothis.com",
  "marathonguide.com",
  "raceentry.com",
  "trisignup.com",
  "trainerday.com",
  "ultrasignup.com",
  "itsyourrace.com",
  "bikereg.com",
  "webscorer.com",
  "eventbrite.com",
  "chronotrack.com",
  "zippyreg.com",
  "coursesignup.com",
  "imathlete.com",
  "runrocknroll.com",
  "racemob.com",
  "athlinks.com",
  "ticketsignup.io",
  "halfmarathons.net",
  "raceraves.com",
  // Not an aggregator, but a Facebook event/post page (especially a post,
  // which can get buried or removed) is a weak stand-in for "the race's
  // own website" -- leaving this null is more honest than a link likely to
  // rot or lead somewhere generic.
  "facebook.com",
  // This list was built by spot-checking real enrichment output and adding
  // whatever turned up -- there is no complete, closed set of race
  // directory sites, so treat this as reducing false positives, not
  // eliminating them. A websiteUrl slipping through from an unlisted
  // aggregator is a known, accepted limitation of a search-based approach,
  // not something worth chasing indefinitely.
];

function isLikelyOfficialSite(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return !AGGREGATOR_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

export interface EnrichmentResult {
  candidates: number;
  enriched: number;
}

/**
 * Fills in websiteUrl/registrationUrl for races discovered via findarace.com
 * (whose own JSON-LD only points back to its own listing page, not the
 * race's actual site) using the same SerpApi web search already built for
 * the live race-lookup fallback. A no-op (not an error) if no search
 * provider is configured.
 */
export async function enrichRacesMissingWebsite(): Promise<EnrichmentResult> {
  const races = await prisma.race.findMany({
    where: { source: "FINDARACE", websiteUrl: null },
    take: ENRICHMENT_BATCH_LIMIT,
  });

  let enriched = 0;

  for (const race of races) {
    const query = [race.name, race.city, race.state, "official race website"].filter(Boolean).join(" ");

    let results;
    try {
      results = await searchWeb(query, 5);
    } catch (error) {
      if (error instanceof SearchNotConfiguredError) return { candidates: races.length, enriched };
      throw error;
    }

    const officialResult = results.find((r) => isLikelyOfficialSite(r.url));
    if (!officialResult) continue;

    await prisma.race.update({
      where: { id: race.id },
      data: { websiteUrl: officialResult.url, registrationUrl: officialResult.url },
    });
    enriched++;
  }

  return { candidates: races.length, enriched };
}
