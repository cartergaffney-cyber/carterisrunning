import Link from "next/link";
import { WORKOUT_TYPE_LABELS } from "@/lib/plan-generator/labels";
import type { WorkoutType } from "@/lib/plan-generator/types";
import type { CalendarDay, CalendarMonth } from "@/lib/calendar/build-calendar";

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Same hue-per-workout-type vocabulary as WorkoutCard, so a session reads the
// same whether it's on the calendar or inside a single race's plan.
const WORKOUT_TYPE_COLORS: Record<string, string> = {
  EASY: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  LONG_RUN: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  BACK_TO_BACK_LONG: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  TEMPO: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  INTERVAL: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  RACE_PACE: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  CROSS_TRAIN: "bg-surface-muted text-muted-foreground",
};

function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function DayCell({ day }: { day: CalendarDay }) {
  const { workout } = day;

  return (
    <div
      className={`flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5 ${
        day.inMonth ? "" : "bg-surface-muted/40"
      } ${day.isToday ? "ring-1 ring-inset ring-accent" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span
          className={`text-xs font-medium tabular-nums ${
            day.isToday ? "text-accent" : day.inMonth ? "text-foreground" : "text-muted-foreground/60"
          }`}
        >
          {day.date.getUTCDate()}
        </span>
        {day.actualMiles != null && (
          <span className="text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400">
            {day.actualMiles.toFixed(1)}mi
          </span>
        )}
      </div>

      {day.raceDays.map((race) => (
        <Link
          key={race.planId}
          href={`/races/${race.planId}`}
          className={`flex flex-col rounded px-1.5 py-1 text-[11px] leading-tight ${
            race.isBackboneRace
              ? "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200"
              : "border border-orange-300 text-orange-800 dark:border-orange-800 dark:text-orange-300"
          }`}
        >
          <span className="font-semibold uppercase tracking-wide">
            {race.isBackboneRace ? "Race day" : `${race.priority} race`}
          </span>
          <span className="truncate">{race.raceName}</span>
        </Link>
      ))}

      {day.adjustment && (
        <span className="truncate text-[10px] leading-tight text-sky-700 dark:text-sky-400" title={day.adjustment.note}>
          {day.adjustment.kind === "SHARPEN" ? "↓ eased" : "↺ recovery"}
        </span>
      )}

      {workout && (
        <Link
          href={`/races/${workout.planId}`}
          className={`flex flex-col rounded px-1.5 py-1 text-[11px] leading-tight ${
            WORKOUT_TYPE_COLORS[workout.workoutType] ?? "bg-surface-muted text-muted-foreground"
          } ${workout.completed ? "opacity-60" : ""}`}
        >
          <span className="truncate font-medium">
            {workout.completed && "✓ "}
            {WORKOUT_TYPE_LABELS[workout.workoutType as WorkoutType] ?? workout.workoutType}
          </span>
          {workout.targetDistanceMiles != null && (
            <span className="tabular-nums opacity-80">{workout.targetDistanceMiles.toFixed(1)} mi</span>
          )}
          {(workout.clubSuggestionReason || workout.hasRoute) && (
            <span className="truncate opacity-80">
              {workout.clubSuggestionReason ? "👥 club run" : "🗺️ route ready"}
            </span>
          )}
        </Link>
      )}

      {day.isRestDay && day.raceDays.length === 0 && (
        <span className="px-0.5 text-[10px] leading-tight text-muted-foreground/70">Rest</span>
      )}

      {day.deferredWorkouts.map((deferred) => (
        <span
          key={deferred.workoutId}
          title={`${deferred.raceName}: ${deferred.description}`}
          className="truncate rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] leading-tight text-muted-foreground"
        >
          {WORKOUT_TYPE_LABELS[deferred.workoutType as WorkoutType] ?? deferred.workoutType} · deferred
        </span>
      ))}
    </div>
  );
}

export function CalendarMonthView({ calendar }: { calendar: CalendarMonth }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 border-l border-t border-border">
            {WEEKDAY_HEADERS.map((label) => (
              <div
                key={label}
                className="border-b border-r border-border bg-surface-muted/60 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {calendar.days.map((day) => (
              <DayCell key={day.date.toISOString()} day={day} />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {monthLabel(calendar.year, calendar.month)}. Sessions link back to the race they belong to.
      </p>
    </div>
  );
}

export { monthLabel };
