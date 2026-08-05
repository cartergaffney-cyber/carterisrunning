import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buildCalendarMonth } from "@/lib/calendar/build-calendar";
import { CalendarMonthView, monthLabel } from "@/components/calendar/CalendarMonthView";
import { today } from "@/lib/utils/date";

// The calendar is a planning horizon, not an archive -- races can be added up
// to 18 months out, so browsing is bounded to that window either side of now.
const MAX_MONTHS_AHEAD = 18;
const MAX_MONTHS_BACK = 12;

function clampMonthOffset(offset: number): number {
  return Math.max(-MAX_MONTHS_BACK, Math.min(MAX_MONTHS_AHEAD, offset));
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { m } = await searchParams;
  const parsed = Number.parseInt(m ?? "0", 10);
  const offset = clampMonthOffset(Number.isFinite(parsed) ? parsed : 0);

  const now = today();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();

  const calendar = await buildCalendarMonth(user.id, year, month);

  const upcomingRaces = calendar.races
    .filter((r) => r.raceDate.getTime() >= now.getTime())
    .sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Every race you&rsquo;re training for, merged into one schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?m=${clampMonthOffset(offset - 1)}`}
            aria-label="Previous month"
            className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-muted"
          >
            ←
          </Link>
          <span className="min-w-40 text-center text-sm font-medium">{monthLabel(year, month)}</span>
          <Link
            href={`/calendar?m=${clampMonthOffset(offset + 1)}`}
            aria-label="Next month"
            className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-muted"
          >
            →
          </Link>
          {offset !== 0 && (
            <Link href="/calendar" className="text-xs font-medium text-accent underline">
              Today
            </Link>
          )}
        </div>
      </div>

      {calendar.races.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No races on your calendar yet.{" "}
          <Link href="/races/new" className="text-accent underline">
            Add one
          </Link>{" "}
          and its training schedule will fill in here.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {upcomingRaces.map((race) => (
              <Link
                key={race.planId}
                href={`/races/${race.planId}`}
                className="flex items-baseline gap-2 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-accent"
              >
                <span className="font-semibold">{race.raceName}</span>
                <span className="text-muted-foreground">
                  {race.raceDistanceLabel} &middot;{" "}
                  {race.raceDate.toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}
                </span>
              </Link>
            ))}
          </div>

          {calendar.hasOverlap && (
            <p className="rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground">
              Two races want a session on the same day this month. Your <strong>next</strong> race
              drives the schedule &mdash; the other race&rsquo;s session is marked{" "}
              <span className="rounded border border-dashed border-border px-1">deferred</span> rather
              than stacked on top, since doing both would double up a hard day.
            </p>
          )}

          <CalendarMonthView calendar={calendar} />
        </>
      )}
    </div>
  );
}
