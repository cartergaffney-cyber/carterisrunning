import type { RaceLookupQuery, RaceLookupResult } from "./types";

const RUNSIGNUP_BASE = "https://runsignup.com/Rest";
const MAX_RACE_CANDIDATES = 4; // races to fetch event detail for, per search

interface RunSignupAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  country_code?: string | null;
}

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

/** Parses distance strings like "26.2 Miles", "50 Kilometers", "5K" into meters. */
function parseDistanceToMeters(distance: string): number | null {
  const match = distance.match(/([\d.]+)\s*(miles?|mi\b|kilometers?|km\b|k\b)/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("mi")) return value * 1609.34;
  if (unit.startsWith("km") || unit === "k") return value * 1000;
  return null;
}

/** Parses RunSignup's "M/D/YYYY HH:mm" wall-clock format as a local Date, not UTC. */
function parseRunSignupDateTime(value: string): Date | null {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return null;

  const [, month, day, year, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour ?? 0), Number(minute ?? 0));
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

    for (const event of events) {
      results.push({
        source: "RUNSIGNUP",
        externalId: `${detail.race_id}:${event.event_id}`,
        name: `${detail.name} — ${event.name}`,
        raceDate: event.start_time ? parseRunSignupDateTime(event.start_time) : null,
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
