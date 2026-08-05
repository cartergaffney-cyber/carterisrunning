import { prisma } from "@/lib/db";
import { addDays, today } from "@/lib/utils/date";
import { DISTANCE_LABELS, DISTANCE_MILES } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";
import type { RacePriority } from "@/generated/prisma/client";

/**
 * A single planned session on the unified calendar, resolved against the
 * backbone plan (see resolveBackbonePlanId).
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
  /** Set when an interim race caused this session to be eased off. */
  easedFor: string | null;
}

export interface CalendarRaceDay {
  planId: string;
  raceName: string;
  raceDistanceLabel: string;
  priority: RacePriority;
  /** False when this race is an interim effort inside another race's build. */
  isBackboneRace: boolean;
}

export type DayAdjustment = { kind: "SHARPEN" | "RECOVER"; raceName: string; note: string };

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  raceDays: CalendarRaceDay[];
  workout: CalendarWorkout | null;
  /** Sessions from non-backbone races, kept visible rather than dropped. */
  deferredWorkouts: CalendarWorkout[];
  isRestDay: boolean;
  adjustment: DayAdjustment | null;
  actualMiles: number | null;
}

export interface CalendarRaceSummary {
  planId: string;
  raceName: string;
  raceDate: Date;
  raceDistanceLabel: string;
  priority: RacePriority;
}

export interface CalendarWeek {
  weekStart: Date;
  days: CalendarDay[];
}

export interface CalendarRange {
  weeks: CalendarWeek[];
  races: CalendarRaceSummary[];
  /** True when an interim race reshaped any day in the loaded range. */
  hasInterimAdjustments: boolean;
}

const UNSCHEDULED_TYPES = new Set<string>(["REST"]);
const HARD_WORKOUT_TYPES = new Set<string>([
  "INTERVAL",
  "TEMPO",
  "RACE_PACE",
  "LONG_RUN",
  "BACK_TO_BACK_LONG",
]);

const PRIORITY_RANK: Record<RacePriority, number> = { A: 0, B: 1, C: 2 };

/**
 * How much an interim race bends the goal race's build around it. These are
 * hand-tuned coaching judgment calls, not physiological constants -- the
 * same posture as pace-multipliers.ts.
 *
 * The shape follows standard A/B/C race practice: a B race earns a genuine
 * mini-taper because you want to run it well, while a C race is trained
 * through -- it replaces a hard session rather than displacing the week
 * around it. Neither one is allowed to reshape the block the way a goal
 * race's own taper does.
 */
const INTERIM_ADJUSTMENT: Record<RacePriority, { sharpenDaysBefore: number; recoverDaysAfterBase: number }> = {
  A: { sharpenDaysBefore: 0, recoverDaysAfterBase: 0 }, // an A race is the backbone; its own plan tapers it
  B: { sharpenDaysBefore: 3, recoverDaysAfterBase: 2 },
  C: { sharpenDaysBefore: 1, recoverDaysAfterBase: 1 },
};

/**
 * Recovery scales with how far you actually raced -- a 5K tune-up costs a
 * day, a half costs most of a week. Roughly a third of the classic "one
 * easy day per mile raced" guidance, which is calibrated for a full return
 * to hard training rather than for staying inside an ongoing build.
 */
function recoveryDaysFor(priority: RacePriority, raceDistance: RaceDistance): number {
  const miles = DISTANCE_MILES[raceDistance] ?? 0;
  return INTERIM_ADJUSTMENT[priority].recoverDaysAfterBase + Math.round(miles / 6);
}

/** Sunday that starts the week containing `date`, UTC-anchored. */
export function sundayOfWeek(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - date.getUTCDay()));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface PlanMeta {
  planId: string;
  raceDate: Date;
  raceName: string;
  raceDistance: RaceDistance;
  raceDistanceLabel: string;
  priority: RacePriority;
}

/**
 * Picks the plan whose build drives a given date.
 *
 * Priority wins, not proximity. A goal (A) race keeps owning the schedule
 * even when a B or C race sits closer -- that's the whole point of running
 * a tune-up inside a build, and letting the nearer race take over is how
 * you end up tapering away a marathon block for a 5K. Among races of equal
 * priority the soonest one governs, since you can't train past a race you
 * haven't run yet.
 *
 * Races already run are excluded, so the calendar hands off cleanly to the
 * next goal race the day after a race day.
 */
function resolveBackbonePlanId(date: Date, plans: PlanMeta[]): string | null {
  const remaining = plans.filter((p) => p.raceDate.getTime() >= date.getTime());
  const pool = remaining.length > 0 ? remaining : plans;
  if (pool.length === 0) return null;

  return [...pool].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    return a.raceDate.getTime() - b.raceDate.getTime();
  })[0].planId;
}

export async function buildCalendarRange(
  userId: string,
  anchorSunday: Date,
  weekCount: number
): Promise<CalendarRange> {
  const grid = Array.from({ length: weekCount * 7 }, (_, i) => addDays(anchorSunday, i));
  const rangeStart = grid[0];
  const rangeEnd = grid[grid.length - 1];

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

  const planMeta: PlanMeta[] = plans.map((p) => ({
    planId: p.id,
    raceDate: p.raceDate,
    raceName: p.race?.commonName ?? p.race?.name ?? DISTANCE_LABELS[p.raceDistance as RaceDistance],
    raceDistance: p.raceDistance as RaceDistance,
    raceDistanceLabel: DISTANCE_LABELS[p.raceDistance as RaceDistance],
    priority: p.priority,
  }));

  const byDate = new Map<string, CalendarWorkout[]>();
  const raceDaysByDate = new Map<string, CalendarRaceDay[]>();
  const actualByDate = new Map<string, number>();
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
        existing.push({
          planId: plan.id,
          raceName: meta.raceName,
          raceDistanceLabel: meta.raceDistanceLabel,
          priority: meta.priority,
          isBackboneRace: resolveBackbonePlanId(workout.date, planMeta) === plan.id,
        });
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
        easedFor: null,
      };

      const existing = byDate.get(key) ?? [];
      existing.push(entry);
      byDate.set(key, existing);
    }
  }

  // Every interim race (one that isn't the backbone on its own race day)
  // projects a sharpen window before it and a recovery window after, so the
  // goal-race build bends around it instead of ignoring it.
  const adjustmentByDate = new Map<string, DayAdjustment>();
  for (const meta of planMeta) {
    const isBackboneOnOwnRaceDay = resolveBackbonePlanId(meta.raceDate, planMeta) === meta.planId;
    if (isBackboneOnOwnRaceDay) continue;

    const { sharpenDaysBefore } = INTERIM_ADJUSTMENT[meta.priority];
    const recoverDays = recoveryDaysFor(meta.priority, meta.raceDistance);

    for (let i = 1; i <= sharpenDaysBefore; i++) {
      adjustmentByDate.set(dateKey(addDays(meta.raceDate, -i)), {
        kind: "SHARPEN",
        raceName: meta.raceName,
        note: `Eased ahead of ${meta.raceName}`,
      });
    }
    for (let i = 1; i <= recoverDays; i++) {
      adjustmentByDate.set(dateKey(addDays(meta.raceDate, i)), {
        kind: "RECOVER",
        raceName: meta.raceName,
        note: `Recovery after ${meta.raceName}`,
      });
    }
  }

  const todayKey = dateKey(today());
  let hasInterimAdjustments = false;

  const days: CalendarDay[] = grid.map((date) => {
    const key = dateKey(date);
    const candidates = byDate.get(key) ?? [];
    const backbonePlanId = resolveBackbonePlanId(date, planMeta);
    const raceDays = raceDaysByDate.get(key) ?? [];

    let workout: CalendarWorkout | null = null;
    const deferredWorkouts: CalendarWorkout[] = [];

    for (const candidate of candidates) {
      if (candidate.planId === backbonePlanId && !workout) workout = candidate;
      else deferredWorkouts.push(candidate);
    }

    const backboneCoversDate = backbonePlanId
      ? (coveredDatesByPlan.get(backbonePlanId)?.has(key) ?? false)
      : false;
    const isRestDay = backboneCoversDate && !workout;

    // Only borrow another race's session when the backbone genuinely isn't
    // running this date -- a prescribed rest day stands, and nothing gets
    // stacked onto a race day.
    if (!workout && !backboneCoversDate && raceDays.length === 0 && deferredWorkouts.length > 0) {
      workout = deferredWorkouts.shift()!;
    }

    // Inside an interim race's sharpen/recovery window the backbone's hard
    // sessions get eased rather than run as written -- racing hard two days
    // after a tempo is how a tune-up turns into an injury.
    const adjustment = adjustmentByDate.get(key) ?? null;
    if (adjustment && workout && HARD_WORKOUT_TYPES.has(workout.workoutType)) {
      workout = { ...workout, workoutType: "EASY", easedFor: adjustment.raceName };
    }
    if (adjustment) hasInterimAdjustments = true;

    return {
      date,
      isToday: key === todayKey,
      raceDays,
      workout,
      deferredWorkouts,
      isRestDay,
      adjustment,
      actualMiles: actualByDate.get(key) ?? null,
    };
  });

  const weeks: CalendarWeek[] = Array.from({ length: weekCount }, (_, i) => ({
    weekStart: grid[i * 7],
    days: days.slice(i * 7, i * 7 + 7),
  }));

  return {
    weeks,
    races: planMeta.map((m) => ({
      planId: m.planId,
      raceName: m.raceName,
      raceDate: m.raceDate,
      raceDistanceLabel: m.raceDistanceLabel,
      priority: m.priority,
    })),
    hasInterimAdjustments,
  };
}
