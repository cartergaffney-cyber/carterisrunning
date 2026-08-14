import Link from "next/link";
import type { CalendarDay } from "@/lib/calendar/build-calendar";
import { formatPaceSecondsPerMile } from "@/lib/utils/pace";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const TYPE_LABEL: Record<string, string> = {
  EASY: "Easy",
  LONG_RUN: "Long run",
  BACK_TO_BACK_LONG: "Back-to-back",
  TEMPO: "Tempo",
  INTERVAL: "Intervals",
  RACE_PACE: "Race pace",
  CROSS_TRAIN: "Cross-train",
  REST: "Rest",
  RACE: "Race",
};

/* Yellow for the hard days, blue for easy, pale for long -- same mapping the
   session pills use everywhere else. */
const TYPE_TONE: Record<string, BadgeTone> = {
  TEMPO: "accent",
  INTERVAL: "accent",
  RACE_PACE: "accent",
  RACE: "accent",
  LONG_RUN: "pale",
  BACK_TO_BACK_LONG: "pale",
  EASY: "info",
  CROSS_TRAIN: "neutral",
  REST: "neutral",
};

/**
 * The one thing the dashboard exists to answer: what am I running today.
 *
 * Reads from the merged calendar rather than a single plan, so on a day where
 * two races both want something the panel shows the one session that serves
 * both -- and the club run that fits it, which is the product's actual point.
 */
export function TodayPanel({ day }: { day: CalendarDay }) {
  const workout = day.workout;
  const race = day.raceDays[0];
  const clubRun = day.clubRuns[0];

  return (
    <div className="grid overflow-hidden rounded-[var(--radius-panel)] border border-border-strong bg-surface lg:grid-cols-[1.55fr_1fr]">
      <div className="relative flex flex-col gap-4 py-8 pl-13 pr-8">
        <div className="road-spine absolute bottom-8 left-[22px] top-8" aria-hidden />

        {race ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="brand-label text-xs tracking-[0.24em] text-accent">Race day</span>
              <Badge tone="accent">{race.raceDistanceLabel}</Badge>
            </div>
            <div className="metric text-[clamp(34px,6vw,54px)] leading-none tracking-[-0.02em] text-foreground">
              {race.raceName}
            </div>
            <p className="max-w-[520px] text-[19px] leading-[1.55] text-muted-foreground">
              Today is the day. Everything in the block was pointed here.
            </p>
          </>
        ) : workout ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="brand-label text-xs tracking-[0.24em] text-accent">Today</span>
              <Badge tone={TYPE_TONE[workout.workoutType] ?? "neutral"}>
                {TYPE_LABEL[workout.workoutType] ?? workout.workoutType}
              </Badge>
              {workout.servesRaces.length > 1 && (
                <span className="brand-label text-[11px] text-faint-foreground">
                  Covers {workout.servesRaces.length} races
                </span>
              )}
            </div>
            <div className="metric text-[clamp(34px,6vw,54px)] leading-none tracking-[-0.02em] text-foreground">
              {workout.targetDistanceMiles ? `${workout.targetDistanceMiles.toFixed(1)} mi` : "Run"}
              {workout.targetPaceSecondsPerMile && (
                <>
                  <span className="text-[0.55em] text-faint-foreground"> @ </span>
                  {formatPaceSecondsPerMile(workout.targetPaceSecondsPerMile)}
                  <span className="text-[0.48em] text-faint-foreground">/mi</span>
                </>
              )}
            </div>
            <p className="max-w-[520px] text-[19px] leading-[1.55] text-muted-foreground">{workout.description}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/runs"
                className="brand-label rounded-full bg-accent px-6 py-4 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
              >
                Log this run
              </Link>
              <Link
                href="/calendar"
                className="brand-label rounded-full border border-border-strong px-6 py-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-[rgba(255,255,255,0.05)]"
              >
                See the week
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="brand-label text-xs tracking-[0.24em] text-accent">Today</span>
            <div className="metric text-[clamp(30px,5vw,44px)] leading-none text-foreground">
              {day.isRestDay ? "Rest" : "Nothing scheduled"}
            </div>
            <p className="max-w-[520px] text-[19px] leading-[1.55] text-muted-foreground">
              {day.isRestDay
                ? "A prescribed rest day. Taking it is part of the plan, not a gap in it."
                : "No race on the calendar yet — add one and the week fills itself in."}
            </p>
            {!day.isRestDay && (
              <div className="pt-2">
                <Link
                  href="/races/new"
                  className="brand-label inline-flex rounded-full bg-accent px-6 py-4 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  Add a race
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col justify-center gap-3.5 border-border bg-surface-muted p-8 lg:border-l">
        {clubRun ? (
          <>
            <span className="brand-label text-[11px] tracking-[0.2em] text-info">
              {clubRun.isMember ? "A club run fits this session" : "A nearby club fits this session"}
            </span>
            <span className="brand-display text-[26px] leading-[1.15] text-foreground">{clubRun.clubName}</span>
            <span className="metric text-[15px] font-medium leading-[1.6] text-muted-foreground">
              {[clubRun.startTime, clubRun.distanceMiles ? `${clubRun.distanceMiles} mi` : null]
                .filter(Boolean)
                .join(" · ")}
              {clubRun.meetingLocation && (
                <>
                  <br />
                  <span className="font-normal">{clubRun.meetingLocation}</span>
                </>
              )}
            </span>
            <p className="text-[15px] leading-[1.55] text-faint-foreground">
              {clubRun.isMember
                ? "You're a member — swap it in and the plan stays intact."
                : "You haven't joined this one yet. Same day and session type as today's run."}
            </p>
            <Link
              href="/clubs"
              className="brand-label mt-1 inline-flex w-fit rounded-full border border-info px-5 py-3 text-xs font-semibold text-info transition-colors hover:bg-[var(--fill-blue-soft)]"
            >
              Run with them
            </Link>
          </>
        ) : (
          <>
            <span className="brand-label text-[11px] tracking-[0.2em] text-info">Club runs</span>
            <p className="text-[15px] leading-[1.55] text-faint-foreground">
              No club session matches today. Quality days are deliberately strict — an unlabelled group run can&rsquo;t
              be assumed to deliver a prescribed effort.
            </p>
            <Link
              href="/clubs"
              className="brand-label mt-1 inline-flex w-fit rounded-full border border-info px-5 py-3 text-xs font-semibold text-info transition-colors hover:bg-[var(--fill-blue-soft)]"
            >
              Browse clubs
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
