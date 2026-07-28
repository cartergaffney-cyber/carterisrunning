export type ParsedSessionType = "EASY" | "TEMPO" | "INTERVAL" | "LONG_RUN" | "SOCIAL" | "TRACK" | "UNKNOWN";

export interface ParsedSession {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday, matching Date.getDay()
  startTime?: string; // "HH:mm"
  type: ParsedSessionType;
  distanceMiles?: number;
  rawText: string;
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MILES_PER_KM = 0.621371;

/**
 * Heuristic keyword parse of a club's page text into candidate weekly
 * sessions. Best-effort only -- results are surfaced as unconfirmed
 * ClubSessions for the user to review, not trusted directly.
 */
export function parseClubSchedule(text: string): ParsedSession[] {
  const lower = text.toLowerCase();
  const sessions: ParsedSession[] = [];

  DAY_NAMES.forEach((dayName, dayIndex) => {
    const regex = new RegExp(`${dayName}s?[^.]{0,80}`, "gi");
    const matches = lower.match(regex);
    if (!matches) return;

    for (const match of matches) {
      const timeMatch = match.match(/(\d{1,2})(:\d{2})?\s*(am|pm)/i);
      let startTime: string | undefined;
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const minute = timeMatch[2] ? timeMatch[2].slice(1) : "00";
        const meridiem = timeMatch[3].toLowerCase();
        if (meridiem === "pm" && hour !== 12) hour += 12;
        if (meridiem === "am" && hour === 12) hour = 0;
        startTime = `${String(hour).padStart(2, "0")}:${minute}`;
      }

      let type: ParsedSessionType = "UNKNOWN";
      if (match.includes("long run")) type = "LONG_RUN";
      else if (match.includes("track")) type = "TRACK";
      else if (match.includes("interval") || match.includes("speed")) type = "INTERVAL";
      else if (match.includes("tempo")) type = "TEMPO";
      else if (match.includes("social") || match.includes("fun run")) type = "SOCIAL";
      else if (match.includes("easy")) type = "EASY";

      const distanceMatch = match.match(/(\d{1,2}(?:\.\d+)?)\s*(miles?|mi\b|km)/);
      const distanceMiles = distanceMatch
        ? distanceMatch[2].startsWith("mi")
          ? parseFloat(distanceMatch[1])
          : parseFloat(distanceMatch[1]) * MILES_PER_KM
        : undefined;

      sessions.push({ dayOfWeek: dayIndex, startTime, type, distanceMiles, rawText: match.trim() });
    }
  });

  // De-dup identical day+type combos -- a page often mentions the same day multiple times.
  const deduped = new Map<string, ParsedSession>();
  for (const session of sessions) {
    const key = `${session.dayOfWeek}-${session.type}`;
    if (!deduped.has(key)) deduped.set(key, session);
  }

  return Array.from(deduped.values());
}
