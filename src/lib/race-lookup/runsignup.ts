import { today } from "@/lib/utils/date";
import { parseDistanceToMeters, parseRunSignupDateTime, type RunSignupAddress } from "./runsignup-shared";
import type { RaceLookupQuery, RaceLookupResult } from "./types";

const RUNSIGNUP_BASE = "https://runsignup.com/Rest";
const MAX_RACE_CANDIDATES = 4; // races to fetch event detail for, per search

interface RunSignupSearchRace {
  race_id: number;
  name: string;
  next_date: string;
  url: string;
  address?: RunSignupAddress;
}

interface RunSignupSearchResponse {
  races?: { race: RunSignupSearchRace }[];
}

interface RunSignupEvent {
  event_id: number;
  name: string;
  distance?: string | null;
  start_time?: string | null;
}

interface RunSignupRaceDetail {
  race_id: number;
  name: string;
  url: string;
  address?: RunSignupAddress;
  events?: RunSignupEvent[];
}

interface RunSignupRaceDetailResponse {
  race?: RunSignupRaceDetail;
}

async function fetchRaceDetail(raceId: number): Promise<RunSignupRaceDetail | null> {
  const response = await fetch(`${RUNSIGNUP_BASE}/race/${raceId}?format=json`);
  if (!response.ok) return null;
  const data: RunSignupRaceDetailResponse = await response.json();
  return data.race ?? null;
}

export async function searchRunSignupRaces(query: RaceLookupQuery): Promise<RaceLookupResult[]> {
  const params = new URLSearchParams({
    name: query.name,
    results_per_page: "10",
    format: "json",
  });
  if (query.city) params.set("city", query.city);
  if (query.state) params.set("state", query.state);

  const response = await fetch(`${RUNSIGNUP_BASE}/races?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`RunSignup search failed: ${response.status} ${await response.text()}`);
  }

  const data: RunSignupSearchResponse = await response.json();
  const candidates = (data.races ?? []).slice(0, MAX_RACE_CANDIDATES);

  const details = await Promise.all(candidates.map((c) => fetchRaceDetail(c.race.race_id)));

  const results: RaceLookupResult[] = [];

  details.forEach((detail, i) => {
    if (!detail) return;
    const address = detail.address ?? candidates[i].race.address;

    const events = detail.events ?? [];
    if (events.length === 0) {
      // No event breakdown available — surface the race itself with no distance,
      // so the user can still confirm/fill it in manually.
      results.push({
        source: "RUNSIGNUP",
        externalId: String(detail.race_id),
        name: detail.name,
        raceDate: parseRunSignupDateTime(candidates[i].race.next_date),
        city: address?.city ?? undefined,
        state: address?.state ?? undefined,
        country: address?.country_code ?? undefined,
        zipcode: address?.zipcode ?? undefined,
        distanceMeters: null,
        terrainType: "ROAD",
        elevationGainMeters: null,
        sourceUrl: detail.url,
        raw: detail,
      });
      return;
    }

    // RunSignup's event list includes every historical year the race has
    // run, not just the upcoming one -- a race with a decade of history can
    // return dozens of past-year "events" here. Only surface events that
    // haven't happened yet; a race with no upcoming events left (or an
    // unparseable date) is skipped as a distance option, since a start
    // date the app can't verify as still upcoming isn't a usable target.
    const now = today();

    for (const event of events) {
      const eventDate = event.start_time ? parseRunSignupDateTime(event.start_time) : null;
      if (!eventDate || eventDate < now) continue;

      results.push({
        source: "RUNSIGNUP",
        externalId: `${detail.race_id}:${event.event_id}`,
        name: `${detail.name} — ${event.name}`,
        raceDate: eventDate,
        city: address?.city ?? undefined,
        state: address?.state ?? undefined,
        country: address?.country_code ?? undefined,
        zipcode: address?.zipcode ?? undefined,
        distanceMeters: event.distance ? parseDistanceToMeters(event.distance) : null,
        terrainType: "ROAD",
        elevationGainMeters: null,
        sourceUrl: detail.url,
        raw: event,
      });
    }
  });

  return results;
}
