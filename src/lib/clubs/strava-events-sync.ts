import { prisma } from "@/lib/db";
import { fetchClubGroupEvents, fetchGroupEventDetail } from "@/lib/strava/client";
import { addDays, today } from "@/lib/utils/date";
import type { ClubSessionType } from "@/generated/prisma/client";

// A safety valve, not a relevance cutoff -- Strava's list has no reliable
// "most relevant first" ordering, and a real club's one genuinely-recurring
// event can be the very last entry in a long history of past one-offs (seen
// in practice: 16 events, only the 16th was the actual weekly session), so
// this can't just take the first few. Bounds worst case only.
const MAX_EVENTS_PER_CLUB = 25;
const MILES_PER_KM = 0.621371;

// Discovering one club's full event history costs one list request plus
// one detail request per event -- checking all of a real user's ~19 clubs
// in a single sync burned through Strava's rate limit in testing. Spreads
// the (expensive, one-time-per-club) full history scan across multiple
// syncs instead of doing it all at once, and skips clubs already checked
// recently so steady-state syncs stay cheap.
const CLUBS_PER_SYNC_BATCH = 4;
const RECHECK_INTERVAL_DAYS = 7;

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
 *
 * Only processes up to CLUBS_PER_SYNC_BATCH clubs not checked in the last
 * RECHECK_INTERVAL_DAYS days (oldest/never-checked first) -- a single
 * "check every club's full event history" sync exhausted Strava's rate
 * limit in testing, so full discovery is spread across several real
 * Strava-sync calls instead of attempted all at once.
 */
export async function syncClubSessionsFromStrava(userId: string, accessToken: string): Promise<StravaEventSyncResult> {
  const recheckCutoff = addDays(today(), -RECHECK_INTERVAL_DAYS);

  const dueClubs = await prisma.club.findMany({
    where: {
      userId,
      status: "TRACKED",
      stravaClubId: { not: null },
      OR: [{ lastEventsSyncedAt: null }, { lastEventsSyncedAt: { lt: recheckCutoff } }],
    },
    orderBy: { lastEventsSyncedAt: { sort: "asc", nulls: "first" } },
    take: CLUBS_PER_SYNC_BATCH,
  });

  let sessionsAdded = 0;
  let sessionsUpdated = 0;

  for (const club of dueClubs) {
    if (!club.stravaClubId) continue;

    let events;
    try {
      events = await fetchClubGroupEvents(accessToken, Number(club.stravaClubId));
    } catch {
      continue; // best-effort -- one club's failure shouldn't block the rest, retried next sync
    }

    // Fetched in parallel within this one club (bounded by
    // MAX_EVENTS_PER_CLUB) -- clubs themselves are still processed one at a
    // time, and only CLUBS_PER_SYNC_BATCH per sync, to keep total request
    // volume well under Strava's rate limit.
    const details = await Promise.all(
      events.slice(0, MAX_EVENTS_PER_CLUB).map((e) => fetchGroupEventDetail(accessToken, e.id))
    );

    await prisma.club.update({ where: { id: club.id }, data: { lastEventsSyncedAt: new Date() } });

    for (const detail of details) {
      if (!detail?.zone || !detail.upcoming_occurrences?.length) continue;
      // "no_repeat" events are one-time (often long-past) events, not an
      // ongoing weekly session -- see the frequency field's doc comment
      // in strava/client.ts. Skipping them is what fixes both real bugs
      // seen in practice: fabricated "every day of the week" sessions
      // pieced together from unrelated historical one-offs, and the
      // actual current weekly session going missing (it was one of these
      // events, just fetched too late by the old 5-event cap).
      if (!detail.frequency || detail.frequency === "no_repeat") continue;

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

  return { clubsProcessed: dueClubs.length, sessionsAdded, sessionsUpdated };
}
