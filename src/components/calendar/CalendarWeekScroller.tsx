"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WORKOUT_TYPE_LABELS } from "@/lib/plan-generator/labels";
import type { WorkoutType } from "@/lib/plan-generator/types";
import type { CalendarDay, CalendarRaceSummary, CalendarWeek } from "@/lib/calendar/build-calendar";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_CELL_HEIGHT = 220;
const PHASE_BAR_HEIGHT = 22;
const VISIBLE_WEEKS = 2;

/**
 * Phases run BASE -> BUILD -> PEAK -> TAPER, so the colours read as a heat
 * ramp that cools at the end: green while you're laying aerobic foundation,
 * amber as intensity climbs, red at peak load, then blue for the taper --
 * the one phase where doing less is the point.
 */
const PHASE_STYLES: Record<string, { label: string; className: string }> = {
  BASE: {
    label: "Aerobic Base",
    className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
  },
  BUILD: {
    label: "Build",
    className: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  },
  PEAK: {
    label: "Peak",
    className: "bg-red-500/15 text-red-800 dark:text-red-300 border-red-500/30",
  },
  TAPER: {
    label: "Taper",
    className: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border-indigo-500/30",
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

      {day.deferredWorkouts.map((deferred) => (
        <span
          key={deferred.workoutId}
          title={`${deferred.raceName}: ${deferred.description}`}
          className="truncate rounded border border-dashed border-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
        >
          {WORKOUT_TYPE_LABELS[deferred.workoutType as WorkoutType] ?? deferred.workoutType} · deferred
        </span>
      ))}
    </div>
  );
}

/**
 * One race's phase bar for a single week. Rendered on the 7-column grid so a
 * segment lines up exactly under the days it covers -- a phase that changes
 * mid-week visibly changes mid-week.
 */
function PhaseBarRow({ week, race }: { week: CalendarWeek; race: CalendarRaceSummary }) {
  const segments = week.phaseSegments.filter((s) => s.planId === race.planId);

  return (
    <div className="grid grid-cols-7" style={{ height: PHASE_BAR_HEIGHT }}>
      {segments.map((segment) => {
        const style = PHASE_STYLES[segment.phase] ?? {
          label: segment.phase,
          className: "bg-surface-muted text-muted-foreground border-border",
        };
        return (
          <div
            key={`${segment.planId}-${segment.startIndex}`}
            style={{ gridColumn: `${segment.startIndex + 1} / span ${segment.span}` }}
            className={`flex items-center overflow-hidden border-l-2 px-2 ${style.className}`}
            title={`${style.label} — ${race.raceName}`}
          >
            <span className="truncate text-[11px] font-semibold leading-none">
              {style.label}
              <span className="ml-1.5 font-normal opacity-75">{race.raceName}</span>
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
  const WEEK_ROW_HEIGHT = DAY_CELL_HEIGHT + races.length * PHASE_BAR_HEIGHT;
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
                {races.map((race) => (
                  <PhaseBarRow key={race.planId} week={week} race={race} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
