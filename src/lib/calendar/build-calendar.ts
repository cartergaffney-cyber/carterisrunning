import { prisma } from "@/lib/db";
import { today } from "@/lib/utils/date";
import { DISTANCE_LABELS } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";

/**
 * A single planned session on the unified calendar, already resolved to one
 * governing race (see resolveGoverningPlanId).
 */
export interface CalendarWorkout {
  workoutId: string;
  planId: string;
  raceName: string;
  workoutType: string;
  description: string;
  targetDistanceMiles: number | null;
  completed: boolean;
  clubSuggestionReason: string | null;
  hasRoute: boolean;
}

/** A race day landing on this calendar date. */
export interface CalendarRaceDay {
  planId: string;
  raceName: string;
  raceDistanceLabel: string;
}

export interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  raceDays: CalendarRaceDay[];
  workout: CalendarWorkout | null;
  /**
   * Same-day sessions from races that aren't governing this date. Surfaced
   * rather than silently dropped -- the user should be able to see that a
   * second race's plan wanted something else here.
   */
  deferredWorkouts: CalendarWorkout[];
  /** Governing plan runs on this date and deliberately scheduled nothing. */
  isRestDay: boolean;
  actualMiles: number | null;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-indexed, matching Date.getUTCMonth()
  days: CalendarDay[];
  races: { planId: string; raceName: string; raceDate: Date; raceDistanceLabel: string }[];
  /** True when >1 active race overlaps this month, i.e. the merge rule actually did something. */
  hasOverlap: boolean;
}

const UNSCHEDULED_TYPES = new Set<string>(["REST"]);

/**
 * Builds the Sunday-aligned grid covering a month, padded out to whole
 * weeks. UTC-anchored throughout, matching this app's calendar-date
 * convention (see utils/date.ts) -- an ambient-local grid would shift days
 * depending on the server's timezone.
 */
function buildMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const leadingBlanks = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(Date.UTC(year, month, 1 - leadingBlanks + i));
    return { date, inMonth: date.getUTCMonth() === month && date.getUTCFullYear() === year };
  });
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Decides which race's plan governs a given date when several are active.
 *
 * The rule is deliberately simple and explainable: whichever race is
 * happening soonest *on or after* that date owns it. That mirrors how
 * multi-race calendars actually work -- you follow one plan at a time, and
 * once a race passes, the next one takes over the schedule. It's also why
 * two full plans never silently stack a long run and an interval session
 * onto the same day.
 *
 * Known simplification: a near-term short race will govern (and taper) even
 * while a much bigger race sits further out, which can under-serve the far
 * race's base building. The deferred-session list is what keeps that
 * visible instead of hidden.
 */
function resolveGoverningPlanId(date: Date, plansByRaceDate: { planId: string; raceDate: Date }[]): string | null {
  const upcoming = plansByRaceDate.find((p) => p.raceDate.getTime() >= date.getTime());
  // Past every race day -- fall back to the last race so trailing days still
  // render with their own plan rather than going blank.
  return upcoming?.planId ?? plansByRaceDate[plansByRaceDate.length - 1]?.planId ?? null;
}

export async function buildCalendarMonth(userId: string, year: number, month: number): Promise<CalendarMonth> {
  const grid = buildMonthGrid(year, month);
  const rangeStart = grid[0].date;
  const rangeEnd = grid[grid.length - 1].date;

  const plans = await prisma.trainingPlan.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { raceDate: "asc" },
    include: {
      race: true,
      plannedWorkouts: {
        where: { date: { gte: rangeStart, lte: rangeEnd } },
        include: { run: true, clubSuggestion: true, generatedRoute: true },
      },
    },
  });

  const planMeta = plans.map((p) => ({
    planId: p.id,
    raceDate: p.raceDate,
    raceName: p.race?.name ?? DISTANCE_LABELS[p.raceDistance as RaceDistance],
    raceDistanceLabel: DISTANCE_LABELS[p.raceDistance as RaceDistance],
  }));

  // date -> all candidate sessions from every active race
  const byDate = new Map<string, CalendarWorkout[]>();
  const raceDaysByDate = new Map<string, CalendarRaceDay[]>();
  const actualByDate = new Map<string, number>();
  // Every date each plan schedules *anything* on, rest days included. Without
  // this, "the governing plan prescribes rest here" is indistinguishable from
  // "the governing plan doesn't run on this date at all" -- and conflating
  // the two silently fills prescribed rest days with the other race's
  // sessions, which is how you end up training 7 days a week across two plans.
  const coveredDatesByPlan = new Map<string, Set<string>>();

  for (const plan of plans) {
    const meta = planMeta.find((m) => m.planId === plan.id)!;
    const covered = new Set<string>();
    coveredDatesByPlan.set(plan.id, covered);

    for (const workout of plan.plannedWorkouts) {
      const key = dateKey(workout.date);
      covered.add(key);

      if (workout.run) {
        actualByDate.set(key, (actualByDate.get(key) ?? 0) + workout.run.distanceMiles);
      }

      if (workout.workoutType === "RACE") {
        const existing = raceDaysByDate.get(key) ?? [];
        existing.push({ planId: plan.id, raceName: meta.raceName, raceDistanceLabel: meta.raceDistanceLabel });
        raceDaysByDate.set(key, existing);
        continue;
      }

      if (UNSCHEDULED_TYPES.has(workout.workoutType)) continue;

      const entry: CalendarWorkout = {
        workoutId: workout.id,
        planId: plan.id,
        raceName: meta.raceName,
        workoutType: workout.workoutType,
        description: workout.description,
        targetDistanceMiles: workout.targetDistanceMiles,
        completed: workout.completed,
        clubSuggestionReason: workout.clubSuggestion?.matchReason ?? null,
        hasRoute: !!workout.generatedRoute,
      };

      const existing = byDate.get(key) ?? [];
      existing.push(entry);
      byDate.set(key, existing);
    }
  }

  const todayKey = dateKey(today());
  let hasOverlap = false;

  const days: CalendarDay[] = grid.map(({ date, inMonth }) => {
    const key = dateKey(date);
    const candidates = byDate.get(key) ?? [];
    const governingPlanId = resolveGoverningPlanId(date, planMeta);

    let workout: CalendarWorkout | null = null;
    const deferredWorkouts: CalendarWorkout[] = [];

    for (const candidate of candidates) {
      if (candidate.planId === governingPlanId && !workout) workout = candidate;
      else deferredWorkouts.push(candidate);
    }

    const raceDays = raceDaysByDate.get(key) ?? [];
    const governingCoversDate = governingPlanId ? (coveredDatesByPlan.get(governingPlanId)?.has(key) ?? false) : false;
    // A governing plan that covers this date but scheduled no session is
    // prescribing rest -- that stands. Only promote another race's session
    // when the governing plan genuinely isn't running yet (or has finished).
    // Race days suppress promotion outright: nothing else belongs on one.
    const isRestDay = governingCoversDate && !workout;
    if (!workout && !governingCoversDate && raceDays.length === 0 && deferredWorkouts.length > 0) {
      workout = deferredWorkouts.shift()!;
    }
    if (deferredWorkouts.length > 0 && inMonth) hasOverlap = true;

    return {
      date,
      inMonth,
      isToday: key === todayKey,
      raceDays,
      workout,
      deferredWorkouts,
      isRestDay,
      actualMiles: actualByDate.get(key) ?? null,
    };
  });

  return {
    year,
    month,
    days,
    races: planMeta.map((m) => ({
      planId: m.planId,
      raceName: m.raceName,
      raceDate: m.raceDate,
      raceDistanceLabel: m.raceDistanceLabel,
    })),
    hasOverlap,
  };
}
