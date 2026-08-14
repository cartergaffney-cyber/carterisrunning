import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { buildCalendarRange, sundayOfWeek } from "@/lib/calendar/build-calendar";
import { CalendarWeekScroller } from "@/components/calendar/CalendarWeekScroller";
import { addDays, today } from "@/lib/utils/date";

// Loaded in one go so stepping between weeks is instant rather than a server
// round-trip per week. A few weeks of lead-in keeps recent history reachable;
// the forward span covers a normal training block, and `?from=` shifts the
// window for races further out in the 18-month horizon.
const WEEKS_BEFORE = 4;
const WEEKS_LOADED = 30;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { from } = await searchParams;
  const shiftWeeks = Number.parseInt(from ?? "0", 10);
  const safeShift = Number.isFinite(shiftWeeks) ? Math.max(-52, Math.min(78, shiftWeeks)) : 0;

  const currentWeekStart = sundayOfWeek(today());
  const anchor = addDays(currentWeekStart, (safeShift - WEEKS_BEFORE) * 7);

  const calendar = await buildCalendarRange(user.id, anchor, WEEKS_LOADED);

  // Where "this week" sits inside the loaded range, so the viewport can open
  // there instead of at the start of the lead-in.
  const initialWeekIndex = safeShift === 0 ? WEEKS_BEFORE : 0;

  const now = today();
  const upcomingRaces = calendar.races
    .filter((r) => r.raceDate.getTime() >= now.getTime())
    .sort((a, b) => a.raceDate.getTime() - b.raceDate.getTime());

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[clamp(26px,4vw,32px)]">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Every race you&rsquo;re training for, merged into one schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?from=${safeShift - 12}`}
            className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-muted"
          >
            ← 3 months
          </Link>
          {safeShift !== 0 && (
            <Link href="/calendar" className="text-xs font-medium text-accent underline">
              Today
            </Link>
          )}
          <Link
            href={`/calendar?from=${safeShift + 12}`}
            className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-muted"
          >
            3 months →
          </Link>
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
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    race.priority === "A" ? "bg-accent/15 text-accent" : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {race.priority}
                </span>
                <span className="font-semibold">{race.raceName}</span>
                <span className="text-muted-foreground">
                  {race.raceDistanceLabel} &middot;{" "}
                  {race.raceDate.toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}
                </span>
              </Link>
            ))}
          </div>

          {calendar.hasInterimAdjustments && (
            <p className="rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground">
              Your <strong>A race</strong> build stays the backbone. A shorter race inside it
              doesn&rsquo;t take the schedule over &mdash; it gets absorbed: hard sessions are{" "}
              <span className="text-sky-700 dark:text-sky-400">eased</span> going into it and{" "}
              <span className="text-sky-700 dark:text-sky-400">recovery</span> follows it, scaled to
              how far you raced. Set each race&rsquo;s priority on the{" "}
              <Link href="/races" className="text-accent underline">
                Races page
              </Link>
              .
            </p>
          )}

          <CalendarWeekScroller
            weeks={calendar.weeks}
            races={calendar.races}
            initialWeekIndex={initialWeekIndex}
          />
        </>
      )}
    </div>
  );
}
