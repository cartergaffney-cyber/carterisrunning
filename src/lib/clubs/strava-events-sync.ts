import { prisma } from "@/lib/db";
import { fetchClubGroupEvents, fetchGroupEventDetail } from "@/lib/strava/client";
import type { ClubSessionType } from "@/generated/prisma/client";

const MAX_EVENTS_PER_CLUB = 5;
const MILES_PER_KM = 0.621371;

function classifySessionType(text: string): ClubSessionType {
  const lower = text.toLowerCase();
  if (lower.includes("long run")) return "LONG_RUN";
  if (lower.includes("track")) return "TRACK";
  if (lower.includes("interval") || lower.includes("speed")) return "INTERVAL";
  if (lower.includes("tempo")) return "TEMPO";
  if (lower.includes("social") || lower.includes("fun run") || lower.includes("happy hour")) return "SOCIAL";
  if (lower.includes("easy")) return "EASY";
  return "UNKNOWN";
}

function parseDistanceMiles(text: string): number | undefined {
  const match = text.toLowerCase().match(/(\d{1,2}(?:\.\d+)?)\s*(miles?|mi\b|km)/);
  if (!match) return undefined;
  const value = parseFloat(match[1]);
  return match[2].startsWith("mi") ? value : value * MILES_PER_KM;
}

/**
 * Converts a UTC occurrence timestamp to the event's own local day-of-week
 * and time-of-day, using the IANA zone Strava provides per-event. The date
 * component of upcoming_occurrences can itself be stale/anchor-only, but
 * the weekday+time it encodes matches the real recurring pattern (verified
 * against a real club: an event described as "every Tues @ 6am" produced
 * exactly that once converted from its UTC timestamp via this zone).
 */
function deriveDayAndTime(isoUtc: string, zone: string): { dayOfWeek: number; startTime: string } {
  const date = new Date(isoUtc);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = WEEKDAYS.indexOf(weekdayShort);

  return { dayOfWeek: dayOfWeek >= 0 ? dayOfWeek : 0, startTime: `${hour}:${minute}` };
}

export interface StravaEventSyncResult {
  clubsProcessed: number;
  sessionsAdded: number;
  sessionsUpdated: number;
}

/**
 * Populates real weekly session times for the user's Strava-tracked clubs
 * from their actual posted group events -- see strava/client.ts for why
 * this needs the per-event detail endpoint, not the club-level list.
 * Still written as isConfirmed: false, consistent with every other
 * schedule-parsing path in this app: even a real, structured event can be
 * a one-off rather than the club's main weekly run, so a human glance
 * before it's used for workout matching is cheap insurance.
 */
export async function syncClubSessionsFromStrava(userId: string, accessToken: string): Promise<StravaEventSyncResult> {
  const clubs = await prisma.club.findMany({
    where: { userId, status: "TRACKED", stravaClubId: { not: null } },
  });

  let sessionsAdded = 0;
  let sessionsUpdated = 0;

  for (const club of clubs) {
    if (!club.stravaClubId) continue;

    let events;
    try {
      events = await fetchClubGroupEvents(accessToken, Number(club.stravaClubId));
    } catch {
      continue; // best-effort -- one club's failure shouldn't block the rest
    }

    // Fetched in parallel per club (bounded by MAX_EVENTS_PER_CLUB, so at
    // most a handful of concurrent requests) -- sequential fetches across
    // up to 19 clubs x 5 events each risked a slow sync button or hitting
    // a serverless timeout.
    const details = await Promise.all(
      events.slice(0, MAX_EVENTS_PER_CLUB).map((e) => fetchGroupEventDetail(accessToken, e.id))
    );

    for (const detail of details) {
      if (!detail?.zone || !detail.upcoming_occurrences?.length) continue;

      const { dayOfWeek, startTime } = deriveDayAndTime(detail.upcoming_occurrences[0], detail.zone);
      const combinedText = `${detail.title} ${detail.description ?? ""}`;

      const data = {
        dayOfWeek,
        startTime,
        type: classifySessionType(combinedText),
        distanceMiles: parseDistanceMiles(combinedText),
        meetingLocation: detail.address ?? undefined,
        rawText: `${detail.title}${detail.description ? ` -- ${detail.description}` : ""}`.slice(0, 1000),
      };

      const existing = await prisma.clubSession.findUnique({
        where: { clubId_stravaEventId: { clubId: club.id, stravaEventId: BigInt(detail.id) } },
      });

      await prisma.clubSession.upsert({
        where: { clubId_stravaEventId: { clubId: club.id, stravaEventId: BigInt(detail.id) } },
        create: { clubId: club.id, stravaEventId: BigInt(detail.id), ...data },
        update: data,
      });

      if (existing) sessionsUpdated++;
      else sessionsAdded++;
    }
  }

  return { clubsProcessed: clubs.length, sessionsAdded, sessionsUpdated };
}
