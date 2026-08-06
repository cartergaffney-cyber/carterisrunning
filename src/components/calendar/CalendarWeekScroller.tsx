"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WORKOUT_TYPE_LABELS } from "@/lib/plan-generator/labels";
import type { WorkoutType } from "@/lib/plan-generator/types";
import type { CalendarDay, CalendarRaceSummary, CalendarWeek } from "@/lib/calendar/build-calendar";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_CELL_HEIGHT = 220;
// Bar plus the gap that separates one race's lane from the next.
const PHASE_BAR_INNER = 22;
const PHASE_LANE_GAP = 5;
const PHASE_STRIP_PAD_TOP = 5;
const PHASE_BAR_HEIGHT = PHASE_BAR_INNER + PHASE_LANE_GAP;
const VISIBLE_WEEKS = 2;

// Width of the chevron point. Each segment ends in an arrow and (unless it
// starts the week) begins with a matching notch, so consecutive phases
// interlock and the whole strip reads left-to-right like a delivery tracker.
const ARROW_W = 11;
const ARROW_HEAD = `polygon(0 0, calc(100% - ${ARROW_W}px) 0, 100% 50%, calc(100% - ${ARROW_W}px) 100%, 0 100%)`;
const ARROW_MID = `polygon(0 0, calc(100% - ${ARROW_W}px) 0, 100% 50%, calc(100% - ${ARROW_W}px) 100%, 0 100%, ${ARROW_W}px 50%)`;

/**
 * Phases run BASE -> BUILD -> PEAK -> TAPER, so the colours read as a heat
 * ramp that cools at the end: green while you're laying aerobic foundation,
 * amber as intensity climbs, red at peak load, then blue for the taper --
 * the one phase where doing less is the point.
 *
 * Only the current week gets the solid fill. Saturating every week turns a
 * long scroll into a wall of colour and flattens the one row that actually
 * matters; tinting the rest keeps the phase readable while letting "where I
 * am right now" carry the emphasis.
 */
const PHASE_STYLES: Record<string, { label: string; solid: string; tinted: string }> = {
  BASE: {
    label: "Aerobic Base",
    solid: "bg-emerald-600 text-white dark:bg-emerald-700",
    tinted: "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  BUILD: {
    label: "Build",
    solid: "bg-amber-500 text-white dark:bg-amber-600",
    tinted: "bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  },
  PEAK: {
    label: "Peak",
    solid: "bg-red-600 text-white dark:bg-red-700",
    tinted: "bg-red-500/15 text-red-800 dark:bg-red-500/20 dark:text-red-300",
  },
  TAPER: {
    label: "Taper",
    solid: "bg-indigo-600 text-white dark:bg-indigo-700",
    tinted: "bg-indigo-500/15 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
};

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  EASY: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  LONG_RUN: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  BACK_TO_BACK_LONG: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  TEMPO: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  INTERVAL: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  RACE_PACE: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  CROSS_TRAIN: "bg-surface-muted text-muted-foreground",
};

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart.getTime() + 6 * 86400000);
  const opts = { month: "short", day: "numeric", timeZone: "UTC" } as const;
  return `${weekStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function DayCell({ day }: { day: CalendarDay }) {
  const { workout } = day;

  return (
    <div
      className={`flex flex-col gap-1.5 overflow-hidden border-b border-r border-border p-2 ${
        day.isToday ? "bg-accent/5 ring-1 ring-inset ring-accent" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className={`text-sm font-semibold tabular-nums ${day.isToday ? "text-accent" : ""}`}>
          {day.date.getUTCDate()}
        </span>
        {day.actualMiles != null && (
          <span className="text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400">
            ✓ {day.actualMiles.toFixed(1)} mi
          </span>
        )}
      </div>

      {day.raceDays.map((race) => (
        <Link
          key={race.planId}
          href={`/races/${race.planId}`}
          className={`flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-xs leading-tight ${
            race.isBackboneRace
              ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200"
              : "border border-orange-300 text-orange-800 dark:border-orange-800 dark:text-orange-300"
          }`}
        >
          <span className="font-bold uppercase tracking-wide">
            {race.isBackboneRace ? "Race day" : `${race.priority} race`}
          </span>
          <span className="font-medium">{race.raceName}</span>
          <span className="opacity-80">{race.raceDistanceLabel}</span>
        </Link>
      ))}

      {workout && (
        <Link
          href={`/races/${workout.planId}`}
          className={`flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-xs leading-tight ${
            WORKOUT_TYPE_COLORS[workout.workoutType] ?? "bg-surface-muted text-muted-foreground"
          } ${workout.completed ? "opacity-60" : ""}`}
        >
          <span className="font-semibold">
            {workout.completed && "✓ "}
            {WORKOUT_TYPE_LABELS[workout.workoutType as WorkoutType] ?? workout.workoutType}
          </span>
          {workout.targetDistanceMiles != null && (
            <span className="tabular-nums opacity-90">{workout.targetDistanceMiles.toFixed(1)} mi</span>
          )}
          <span className="line-clamp-2 opacity-80">{workout.description}</span>
        </Link>
      )}

      {day.isRestDay && day.raceDays.length === 0 && (
        <span className="px-0.5 text-xs italic text-muted-foreground/70">Rest</span>
      )}

      {workout?.easedFor && (
        <span className="truncate text-[11px] text-sky-700 dark:text-sky-400">↓ eased for {workout.easedFor}</span>
      )}
      {!workout?.easedFor && day.adjustment && (
        <span className="truncate text-[11px] text-sky-700 dark:text-sky-400" title={day.adjustment.note}>
          {day.adjustment.kind === "SHARPEN" ? "↓ eased" : "↺ recovery"}
        </span>
      )}

      {workout?.clubSuggestionReason && (
        <span className="truncate text-[11px] text-violet-600 dark:text-violet-400">
          👥 {workout.clubSuggestionReason}
        </span>
      )}
      {workout?.hasRoute && (
        <span className="truncate text-[11px] text-muted-foreground">🗺️ Route ready</span>
      )}

      {workout && workout.servesRaces.length > 1 && (
        <span
          title={`One session covering: ${workout.servesRaces.join(", ")}`}
          className="truncate text-[11px] text-muted-foreground"
        >
          ⇢ covers {workout.servesRaces.length} races
        </span>
      )}
    </div>
  );
}

/**
 * One race's phase bar for a single week. Rendered on the 7-column grid so a
 * segment lines up exactly under the days it covers -- a phase that changes
 * mid-week visibly changes mid-week.
 */
function PhaseBarRow({
  week,
  race,
  isCurrentWeek,
}: {
  week: CalendarWeek;
  race: CalendarRaceSummary;
  isCurrentWeek: boolean;
}) {
  const segments = week.phaseSegments.filter((s) => s.planId === race.planId);

  return (
    <div
      className="grid grid-cols-7 px-1"
      style={{ height: PHASE_BAR_INNER, marginBottom: PHASE_LANE_GAP }}
    >
      {segments.map((segment) => {
        const style = PHASE_STYLES[segment.phase] ?? {
          label: segment.phase,
          solid: "bg-surface-muted text-muted-foreground",
          tinted: "bg-surface-muted text-muted-foreground",
        };
        // A segment starting the week has nothing to interlock with on its
        // left, so it gets a flat edge instead of a notch.
        const startsWeek = segment.startIndex === 0;
        return (
          <div
            key={`${segment.planId}-${segment.startIndex}`}
            style={{
              gridColumn: `${segment.startIndex + 1} / span ${segment.span}`,
              clipPath: startsWeek ? ARROW_HEAD : ARROW_MID,
              paddingLeft: startsWeek ? 8 : ARROW_W + 4,
              paddingRight: ARROW_W + 4,
            }}
            className={`flex items-center justify-center overflow-hidden ${
              isCurrentWeek ? style.solid : style.tinted
            }`}
            title={`${style.label} — ${race.raceName}`}
          >
            <span className="truncate text-[11px] font-semibold uppercase tracking-wide leading-none">
              {style.label}
              <span className="ml-1.5 font-medium normal-case tracking-normal opacity-80">
                {race.raceName}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CalendarWeekScroller({
  weeks,
  races,
  initialWeekIndex,
}: {
  weeks: CalendarWeek[];
  races: CalendarRaceSummary[];
  initialWeekIndex: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [topWeek, setTopWeek] = useState(initialWeekIndex);

  // Every week reserves a bar slot per race, even when that race has no
  // segments there, so all week rows stay the same height -- scroll snapping
  // depends on a single fixed row height.
  const WEEK_ROW_HEIGHT = DAY_CELL_HEIGHT + PHASE_STRIP_PAD_TOP + races.length * PHASE_BAR_HEIGHT;
  const maxIndex = Math.max(0, weeks.length - VISIBLE_WEEKS);

  const scrollToWeek = useCallback(
    (index: number, smooth = true) => {
      const clamped = Math.max(0, Math.min(maxIndex, index));
      scrollRef.current?.scrollTo({ top: clamped * WEEK_ROW_HEIGHT, behavior: smooth ? "smooth" : "auto" });
      setTopWeek(clamped);
    },
    [maxIndex]
  );

  // Jump straight to the current week on load without animating past every
  // earlier week.
  useEffect(() => {
    scrollToWeek(initialWeekIndex, false);
  }, [initialWeekIndex, scrollToWeek]);

  // Keep the label in step when scrolled by wheel/trackpad rather than the
  // buttons.
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setTopWeek(Math.round(el.scrollTop / WEEK_ROW_HEIGHT));
  }

  const visibleLabel =
    weeks.length === 0
      ? ""
      : `${formatWeekLabel(weeks[Math.min(topWeek, weeks.length - 1)].weekStart)}${
          topWeek + 1 < weeks.length ? `  ·  ${formatWeekLabel(weeks[topWeek + 1].weekStart)}` : ""
        }`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium tabular-nums">{visibleLabel}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToWeek(topWeek - 1)}
            disabled={topWeek <= 0}
            aria-label="Previous week"
            className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            ↑ Week
          </button>
          <button
            type="button"
            onClick={() => scrollToWeek(initialWeekIndex)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-muted"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => scrollToWeek(topWeek + 1)}
            disabled={topWeek >= maxIndex}
            aria-label="Next week"
            className="rounded-full border border-border px-3 py-1.5 text-sm transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            ↓ Week
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-7 border-b border-border bg-surface-muted/60">
            {WEEKDAY_HEADERS.map((label) => (
              <div
                key={label}
                className="border-r border-border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>

          {/*
            Fixed to exactly VISIBLE_WEEKS rows with y-mandatory snapping, so
            wheel/trackpad scrolling lands on a week boundary the same way the
            buttons do -- the viewport can never come to rest mid-week.
          */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ height: WEEK_ROW_HEIGHT * VISIBLE_WEEKS, scrollSnapType: "y mandatory" }}
            className="overflow-y-auto overscroll-contain"
          >
            {weeks.map((week) => (
              <div
                key={week.weekStart.toISOString()}
                style={{ height: WEEK_ROW_HEIGHT, scrollSnapAlign: "start" }}
                className="flex flex-col border-b border-border last:border-b-0"
              >
                <div className="grid grid-cols-7" style={{ height: DAY_CELL_HEIGHT }}>
                  {week.days.map((day) => (
                    <DayCell key={day.date.toISOString()} day={day} />
                  ))}
                </div>
                <div className="bg-surface-muted/40" style={{ paddingTop: PHASE_STRIP_PAD_TOP }}>
                  {races.map((race) => (
                    <PhaseBarRow
                      key={race.planId}
                      week={week}
                      race={race}
                      isCurrentWeek={week.days.some((d) => d.isToday)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
