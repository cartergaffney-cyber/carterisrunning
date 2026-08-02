import { prisma } from "@/lib/db";
import { refreshAccessToken } from "@/lib/auth/strava-oauth";
import type { User } from "@/generated/prisma/client";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh if expiring within 5 minutes
const MAX_PAGES = 20; // 20 * 100 = up to 2,000 activities per sync, ample for a personal app

export interface StravaSummaryActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  total_elevation_gain: number; // meters
  type: string;
  sport_type: string;
  start_date: string; // ISO 8601, UTC
  start_date_local: string; // ISO 8601 wall-clock time in the athlete's local zone, mislabeled with a "Z" suffix
  suffer_score?: number | null;
  average_heartrate?: number | null;
}

/**
 * Strava's `start_date_local` is the athlete's local wall-clock time but
 * serialized with a "Z" (UTC) suffix, so `new Date(...)` on it would
 * silently reinterpret those digits through the server's own timezone. This
 * reads the literal Y/M/D/H/M/S digits and builds a Date anchored to UTC
 * from them directly (`Date.UTC`, not the ambient-local constructor), so the
 * run lands on the athlete's actual calendar day regardless of what
 * timezone the server happens to run in -- using the local constructor here
 * would encode the athlete's wall-clock digits as ambient-local time on
 * whichever machine runs this code, which silently shifts a calendar day
 * when read back on a machine in a different timezone (see date.ts's
 * module docstring for the full explanation of why this app anchors all
 * calendar dates to UTC).
 */
export function parseStravaLocalDate(startDateLocal: string): Date {
  const match = startDateLocal.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/
  );
  if (!match) {
    throw new Error(`Unrecognized Strava start_date_local format: ${startDateLocal}`);
  }
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

export async function getValidAccessToken(user: User): Promise<string> {
  const expiresInMs = user.stravaTokenExpiresAt.getTime() - Date.now();

  if (expiresInMs > TOKEN_REFRESH_BUFFER_MS) {
    return user.stravaAccessToken;
  }

  const refreshed = await refreshAccessToken(user.stravaRefreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stravaAccessToken: refreshed.access_token,
      stravaRefreshToken: refreshed.refresh_token,
      stravaTokenExpiresAt: new Date(refreshed.expires_at * 1000),
    },
  });

  return refreshed.access_token;
}

export interface StravaSummaryClub {
  id: number;
  name: string;
  url?: string | null; // Strava's own vanity-slug for the club, e.g. "boston-running-club"
  city?: string | null;
  state?: string | null;
  member_count?: number | null;
}

/**
 * Clubs the athlete has already joined on Strava -- distinct from
 * lib/clubs/discovery.ts's web-search-based discovery of *new* nearby
 * clubs (Strava's API has no location-based club search, only "clubs this
 * athlete belongs to"). No pagination here: Strava doesn't paginate this
 * endpoint, and a real athlete's club count is always small.
 */
export async function fetchAthleteClubs(accessToken: string): Promise<StravaSummaryClub[]> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete/clubs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Strava clubs fetch failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export interface StravaGroupEventSummary {
  id: number;
  title: string;
}

export interface StravaGroupEventDetail {
  id: number;
  title: string;
  description?: string | null;
  activity_type?: string | null;
  address?: string | null;
  zone?: string | null; // IANA timezone, e.g. "America/Chicago"
  upcoming_occurrences?: string[]; // ISO 8601 UTC timestamps
}

/**
 * Lists a club's group events (resource_state 2 -- summary only). Per
 * Strava's docs this "current occurrence" data can be stale for recurring
 * events (seen in practice: an anchor date years in the past), so this is
 * only used to get event IDs; real scheduling data comes from
 * fetchGroupEventDetail below.
 */
export async function fetchClubGroupEvents(accessToken: string, clubId: number): Promise<StravaGroupEventSummary[]> {
  const response = await fetch(`${STRAVA_API_BASE}/clubs/${clubId}/group_events`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Strava club group events fetch failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * The single-event endpoint returns resource_state 3 -- a real, current
 * upcoming_occurrences entry (confirmed empirically against a club's actual
 * "every Tuesday 6am" recurring run) plus the event's own IANA timezone,
 * needed to convert that UTC timestamp to the correct local day/time.
 */
export async function fetchGroupEventDetail(accessToken: string, eventId: number): Promise<StravaGroupEventDetail | null> {
  const response = await fetch(`${STRAVA_API_BASE}/group_events/${eventId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;
  return response.json();
}

export async function fetchActivities(
  accessToken: string,
  after?: Date
): Promise<StravaSummaryActivity[]> {
  const activities: StravaSummaryActivity[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: "100",
    });
    if (after) {
      params.set("after", String(Math.floor(after.getTime() / 1000)));
    }

    const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Strava activities fetch failed: ${response.status} ${await response.text()}`);
    }

    const pageActivities: StravaSummaryActivity[] = await response.json();
    activities.push(...pageActivities);

    if (pageActivities.length < 100) break;
  }

  return activities;
}
