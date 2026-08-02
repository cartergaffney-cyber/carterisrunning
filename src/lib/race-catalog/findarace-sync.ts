import { prisma } from "@/lib/db";
import { inferDistanceMetersFromName } from "@/lib/race-lookup/distance-mapping";
import { parseLocalDate, today } from "@/lib/utils/date";

const SITEMAP_URL = "https://findarace.com/us/sitemap-events-current.xml";
const USER_AGENT = "Mozilla/5.0 (compatible; CarterIsRunningBot/1.0; +https://www.carterisrunning.com)";
const FETCH_TIMEOUT_MS = 10_000;
const REQUEST_DELAY_MS = 300;

/**
 * findarace.com is a supplementary discovery source for races that don't
 * use RunSignup (e.g. the Austin Marathon runs its own registration).
 * Deliberately conservative about what counts as "respectful use":
 *  - Only their published sitemap is enumerated (explicitly meant for
 *    crawling -- it's what robots.txt points crawlers at) and only their
 *    per-event JSON-LD (schema.org SportsEvent, explicitly structured for
 *    machine consumption) is parsed -- never their rendered HTML/CSS.
 *  - runguides.com was considered and rejected: its robots.txt explicitly
 *    disallows /runs, the exact path its listings live under.
 *  - Only a small, capped number of new candidate pages are fetched per
 *    run (see DISCOVERY_FETCH_LIMIT below), not the full ~48k-URL sitemap,
 *    and only for slugs that look like an actual race (see
 *    looksLikeCandidateRace) -- this is gap-filling for real races RunSignup
 *    doesn't have, not a wholesale mirror of findarace's database.
 */
const DISCOVERY_FETCH_LIMIT = 40;

// Keeps this to real, single races -- findarace's "marathon"-matching slugs
// are dominated by training clubs, training classes, virtual events, and
// club memberships that use the word but aren't an actual race with a
// specific date and place (confirmed empirically: the first ~25
// marathon/ultra/trail-race candidates in raw sitemap order were almost
// entirely this kind of noise, not real races like the Austin Marathon).
const NOISE_SLUG_PATTERNS = [
  "virtual-challenge",
  "-medal",
  "medal-",
  "additional-payment",
  "training-program",
  "training-group",
  "-training-",
  "training-2025",
  "training-evening",
  "training-morning",
  "prep-class",
  "membership",
  "-club-",
  "galloway",
  "virtual-",
  "-virtual",
];

// Deliberately narrow: "marathon" (covers half-marathon too, same
// substring), "ultra", and "trail-race" are rare, high-value, low-noise
// signals -- these are the races most likely to run their own registration
// and be genuinely missing from RunSignup, matching the motivating example
// (the Austin Marathon). A generic "5k"/"10k" pattern was tried first and
// matched over 25,000 of the sitemap's ~48,000 URLs -- basically every
// small local fun-run, which RunSignup already covers thoroughly and which
// would've buried the handful of actually-missing majors in noise.
const CANDIDATE_SLUG_PATTERN = /marathon|ultra|trail-race/;

interface SitemapEntry {
  url: string;
  slug: string;
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT },
    });
    return response.ok ? response : null;
  } catch {
    return null;
  }
}

export async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const response = await fetchWithTimeout(SITEMAP_URL);
  if (!response) return [];

  const xml = await response.text();
  const entries: SitemapEntry[] = [];
  const locPattern = /<loc>([^<]+)<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = locPattern.exec(xml)) !== null) {
    const url = match[1];
    const slug = url.split("/").filter(Boolean).pop() ?? "";
    entries.push({ url, slug });
  }
  return entries;
}

/**
 * With ~2-3k candidates and only a few dozen fetched per monthly run,
 * there's no persisted cursor tracking which slugs were already tried --
 * processing candidates in a fixed (sitemap) order would mean every run
 * re-hits the same handful at the front forever, never reaching the rest.
 * A fresh shuffle each run means repeated monthly runs sample different
 * candidates over time instead of the same fixed prefix.
 */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function looksLikeCandidateRace(slug: string): boolean {
  const lower = slug.toLowerCase();
  if (NOISE_SLUG_PATTERNS.some((p) => lower.includes(p))) return false;
  return CANDIDATE_SLUG_PATTERN.test(lower);
}

interface FindARaceEvent {
  name: string;
  url: string;
  startDate: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
}

/**
 * Address strings from findarace's JSON-LD aren't consistently formatted
 * (some include a street name, some don't), so a fixed "Nth item from the
 * end" split is unreliable -- anchor on the state (2 uppercase letters)
 * and zip (5 digits) instead, which are the two most consistently-shaped
 * tokens, and take whatever's immediately before them as the city.
 */
function parseUsAddress(address: string): { city: string | null; state: string | null } {
  const parts = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const stateIndex = parts.findIndex((p) => /^[A-Z]{2}$/.test(p));
  const zipIndex = parts.findIndex((p) => /^\d{5}(-\d{4})?$/.test(p));
  const cityIndex = zipIndex >= 0 ? zipIndex - 1 : stateIndex >= 0 ? stateIndex - 1 : -1;

  return {
    city: cityIndex >= 0 ? parts[cityIndex] : null,
    state: stateIndex >= 0 ? parts[stateIndex] : null,
  };
}

/**
 * findarace's JSON-LD startDate is usually a bare "YYYY-MM-DD" but some
 * listings (seen in practice) use a full ISO datetime instead -- strip any
 * time component and validate before handing off to parseLocalDate, which
 * assumes a clean date-only string.
 */
function parseFindARaceDate(startDate: string): Date | null {
  const dateOnly = startDate.split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const parsed = parseLocalDate(dateOnly);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Extracts the schema.org SportsEvent block from a findarace.com event page's JSON-LD. */
function parseEventJsonLd(html: string): FindARaceEvent | null {
  const scriptPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const nodes: unknown[] =
      typeof parsed === "object" && parsed !== null && "@graph" in parsed
        ? ((parsed as { "@graph": unknown[] })["@graph"] ?? [])
        : [parsed];

    const event = nodes.find(
      (n): n is Record<string, unknown> =>
        typeof n === "object" && n !== null && (n as Record<string, unknown>)["@type"] === "SportsEvent"
    );
    if (!event) continue;

    const location = event.location as Record<string, unknown> | undefined;
    const address = (location?.address ?? "") as string;
    const { city, state } = parseUsAddress(address);

    return {
      name: String(event.name ?? ""),
      url: String(event.url ?? ""),
      startDate: typeof event.startDate === "string" ? event.startDate : null,
      description: typeof event.description === "string" ? event.description : null,
      city,
      state,
    };
  }

  return null;
}

export interface FindARaceDiscoveryResult {
  candidatesFound: number;
  fetched: number;
  added: number;
}

/**
 * Finds real races on findarace.com that aren't already in the local
 * catalog and adds them. Does NOT fill in websiteUrl/registrationUrl --
 * findarace's own JSON-LD only gives us findarace's own listing page, not
 * the race's actual official site, so that's left to a separate enrichment
 * pass (see enrich-race.ts) that reuses the app's existing web-search
 * infrastructure.
 */
export async function discoverNewFindARaceEvents(): Promise<FindARaceDiscoveryResult> {
  const entries = await fetchSitemapEntries();
  const candidates = shuffle(entries.filter((e) => looksLikeCandidateRace(e.slug)));

  let fetched = 0;
  let added = 0;

  for (const candidate of candidates) {
    if (fetched >= DISCOVERY_FETCH_LIMIT) break;

    const alreadySynced = await prisma.race.findFirst({
      where: { source: "FINDARACE", externalId: candidate.slug },
      select: { id: true },
    });
    if (alreadySynced) continue;

    // Cheap dedup against races we already have from another source --
    // not perfect (best-effort word overlap on the slug), but good enough
    // to avoid an obvious duplicate of an already-synced RunSignup/curated
    // race, which is the common case (e.g. a big race cross-listed on
    // both RunSignup and findarace).
    const significantWords = candidate.slug.split("-").filter((w) => w.length > 3 && !/^\d+$/.test(w));
    if (significantWords.length >= 2) {
      const possibleDuplicate = await prisma.race.findFirst({
        where: {
          AND: significantWords
            .slice(0, 3)
            .map((word) => ({ name: { contains: word, mode: "insensitive" as const } })),
        },
        select: { id: true },
      });
      if (possibleDuplicate) continue;
    }

    fetched++;
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));

    const response = await fetchWithTimeout(candidate.url);
    if (!response) continue;
    const html = await response.text();
    const event = parseEventJsonLd(html);
    if (!event || !event.name || !event.startDate) continue;

    const raceDate = parseFindARaceDate(event.startDate);
    // findarace's "current" sitemap still includes long-expired listings
    // (seen in practice: a 2016 event) -- same principle as the RunSignup
    // sync, never add a race that's already happened.
    if (!raceDate || raceDate.getTime() < today().getTime()) continue;

    await prisma.race.upsert({
      where: { source_externalId: { source: "FINDARACE", externalId: candidate.slug } },
      create: {
        source: "FINDARACE",
        externalId: candidate.slug,
        name: event.name,
        raceDate,
        city: event.city ?? undefined,
        state: event.state ?? undefined,
        country: "US",
        distanceMeters: inferDistanceMetersFromName(event.name) ?? undefined,
        terrainType: "UNKNOWN",
        description: event.description ?? undefined,
        sourceUrl: event.url || candidate.url,
        lastSyncedAt: new Date(),
      },
      update: {
        raceDate,
        city: event.city ?? undefined,
        state: event.state ?? undefined,
        description: event.description ?? undefined,
        lastSyncedAt: new Date(),
      },
    });
    added++;
  }

  return { candidatesFound: candidates.length, fetched, added };
}
