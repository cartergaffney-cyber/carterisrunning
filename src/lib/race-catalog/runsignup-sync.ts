import { prisma } from "@/lib/db";
import { parseRunSignupDateTime, stripHtmlToBlurb, type RunSignupAddress } from "@/lib/race-lookup/runsignup-shared";
import { inferDistanceMetersFromName } from "@/lib/race-lookup/distance-mapping";
import { today } from "@/lib/utils/date";
import type { TerrainType } from "@/generated/prisma/client";

const RUNSIGNUP_BASE = "https://runsignup.com/Rest";
const PAGE_SIZE = 500;
const REQUEST_DELAY_MS = 150; // be a polite API consumer, no key/rate-limit documented but no reason to hammer it

// RunSignup's own event-type taxonomy -- these are the categories relevant
// to a running-training app (excludes triathlon/bike/swim/ski/etc., which
// RunSignup's /races search also indexes). Also doubles as the terrain
// signal: races found under trail_race/ultra are marked TRAIL, the rest
// ROAD -- more reliable than keyword-guessing from free text, since we
// chose which bucket to query.
const EVENT_TYPES = ["running_race", "running_only", "trail_race", "ultra"] as const;
type RunSignupEventType = (typeof EVENT_TYPES)[number];

const TERRAIN_BY_EVENT_TYPE: Record<RunSignupEventType, TerrainType> = {
  running_race: "ROAD",
  running_only: "ROAD",
  trail_race: "TRAIL",
  ultra: "TRAIL",
};

interface RunSignupBulkRace {
  race_id: number;
  name: string;
  next_date: string | null;
  url: string;
  external_race_url?: string | null;
  logo_url?: string | null;
  description?: string | null;
  address?: RunSignupAddress;
}

interface RunSignupBulkResponse {
  races?: { race: RunSignupBulkRace }[];
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const UPSERT_MAX_ATTEMPTS = 4;
const UPSERT_RETRY_DELAY_MS = 1000;

/**
 * A nationwide backfill (a few thousand rows, several minutes of paginated
 * RunSignup calls) runs long enough that the DB connection occasionally
 * drops mid-run ("Connection terminated unexpectedly") -- observed in
 * practice against Neon. Upserts are naturally idempotent
 * (keyed on @@unique([source, externalId])), so retrying a single failed
 * one is safe; this just keeps one transient drop from killing an
 * otherwise-successful multi-minute run.
 */
async function upsertWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= UPSERT_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, UPSERT_RETRY_DELAY_MS * attempt));
    }
  }
  throw lastError;
}

async function fetchPage(
  eventType: RunSignupEventType,
  startDate: string,
  endDate: string,
  page: number
): Promise<RunSignupBulkRace[]> {
  const params = new URLSearchParams({
    results_per_page: String(PAGE_SIZE),
    page: String(page),
    format: "json",
    event_type: eventType,
    start_date: startDate,
    end_date: endDate,
    // Without this, RunSignup's default date filter does a looser
    // start/end overlap match (and appears to let a lot of undated
    // series/training-group listings through) rather than restricting to
    // races whose own start date falls in [start_date, end_date] --
    // confirmed empirically: the same query without this flag returned
    // races with next_date outside the requested range, or null.
    search_start_date_only: "T",
  });

  const response = await fetch(`${RUNSIGNUP_BASE}/races?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`RunSignup bulk sync failed (${eventType}, page ${page}): ${response.status}`);
  }

  const data: RunSignupBulkResponse = await response.json();
  return (data.races ?? []).map((r) => r.race);
}

export interface RunSignupSyncRange {
  startDate: Date;
  endDate: Date;
}

export interface RunSignupSyncResult {
  upserted: number;
  skippedNoDate: number;
}

/**
 * Upserts every RunSignup race in the given date range (across the four
 * running-relevant event types) into the local Race catalog. Keyed on
 * @@unique([source, externalId]) so re-running this for an overlapping
 * range is idempotent -- existing rows are updated in place, not
 * duplicated. Deliberately does NOT fetch each race's full detail (event
 * breakdown) -- one extra API call per race adds up over a full sync and
 * isn't worth it for a routine sync. Distance is instead inferred
 * from the race's own name (inferDistanceMetersFromName) where the name
 * follows a standard convention (e.g. "Peachtree 10K") -- left null
 * otherwise, same as any other field the catalog doesn't have confident
 * data for.
 */
export async function syncRunSignupRaces({ startDate, endDate }: RunSignupSyncRange): Promise<RunSignupSyncResult> {
  const startStr = toDateOnly(startDate);
  const endStr = toDateOnly(endDate);
  let upserted = 0;
  let skippedNoDate = 0;

  for (const eventType of EVENT_TYPES) {
    let page = 1;
    for (;;) {
      const races = await fetchPage(eventType, startStr, endStr, page);
      if (races.length === 0) break;

      for (const race of races) {
        const raceDate = parseRunSignupDateTime(race.next_date);
        if (!raceDate) {
          skippedNoDate++;
          continue;
        }

        const data = {
          name: race.name,
          raceDate,
          city: race.address?.city ?? undefined,
          state: race.address?.state ?? undefined,
          country: race.address?.country_code ?? undefined,
          zipcode: race.address?.zipcode ?? undefined,
          distanceMeters: inferDistanceMetersFromName(race.name) ?? undefined,
          terrainType: TERRAIN_BY_EVENT_TYPE[eventType],
          logoUrl: race.logo_url ?? undefined,
          websiteUrl: race.external_race_url ?? undefined,
          registrationUrl: race.url,
          sourceUrl: race.url,
          description: stripHtmlToBlurb(race.description) ?? undefined,
          lastSyncedAt: new Date(),
        };

        await upsertWithRetry(() =>
          prisma.race.upsert({
            where: { source_externalId: { source: "RUNSIGNUP", externalId: String(race.race_id) } },
            create: { source: "RUNSIGNUP", externalId: String(race.race_id), ...data },
            update: data,
          })
        );
        upserted++;
      }

      if (races.length < PAGE_SIZE) break;
      page++;
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  return { upserted, skippedNoDate };
}

/**
 * Deletes past-dated RunSignup-sourced races that no user's plan points to
 * -- keeps the catalog from growing unbounded while never touching a row
 * an actual TrainingPlan references (regardless of how old it now is).
 * Scoped to RUNSIGNUP only: CURATED majors are permanent reference data,
 * and MANUAL/WEB_SEARCH rows are created directly alongside a user's plan
 * confirmation, not bulk-synced noise.
 */
export async function prunePastSyncedRaces(): Promise<{ deleted: number }> {
  const result = await prisma.race.deleteMany({
    where: {
      source: "RUNSIGNUP",
      raceDate: { lt: today() },
      trainingPlans: { none: {} },
    },
  });
  return { deleted: result.count };
}
