import { prisma } from "@/lib/db";
import { addDays, today } from "@/lib/utils/date";
import { DISTANCE_LABELS, DISTANCE_MILES } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";
import type { RacePriority, TrainingPhase } from "@/generated/prisma/client";

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
  /** Every race this one session is doing work for, in priority order. */
  servesRaces: string[];
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
  /** Exactly one session per day, merged across every active race. */
  workout: CalendarWorkout | null;
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

/**
 * One race's training phase across a contiguous stretch of a single week.
 * A week yields more than one segment per race when a phase changes
 * mid-week, which is common -- phase boundaries don't respect weekends.
 */
export interface WeekPhaseSegment {
  planId: string;
  raceName: string;
  phase: TrainingPhase;
  /** 0-6 index of the first day in the week this segment covers. */
  startIndex: number;
  /** Number of days covered, 1-7. */
  span: number;
}

export interface CalendarWeek {
  weekStart: Date;
  days: CalendarDay[];
  /** Grouped by race, so overlapping phases stack as separate bars. */
  phaseSegments: WeekPhaseSegment[];
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

// Sessions whose value is time on feet -- two plans both asking for one can
// be satisfied by running the longer of the two.
const VOLUME_TYPES = new Set(["EASY", "LONG_RUN", "BACK_TO_BACK_LONG"]);
// Sessions with a specific intensity prescription. Distance here isn't a
// dial you can turn up: stretching an interval session to a long run's
// mileage isn't a merge, it's an injury.
const QUALITY_TYPES = new Set(["TEMPO", "INTERVAL", "RACE_PACE"]);

/**
 * Collapses every race's ask for one day into the single session you should
 * actually run. Never returns two workouts -- you only have one day.
 *
 * The backbone race's prescription is the starting point, because that's the
 * race the whole block is built around. From there:
 *
 *  - Same type, another race wants it longer -> run the longer one. It
 *    satisfies both, and the shorter ask is a strict subset.
 *  - Backbone has an easy day, another race wants quality -> run the
 *    quality session. An easy day is the most substitutable thing in a
 *    week, so this is where a second race's specific work fits for free.
 *  - Anything else -> keep the backbone's session. In particular a long run
 *    is never traded away for another race's tempo; that's the priority
 *    race's key session and swapping it is how a build quietly unravels.
 */
function mergeDaySessions(candidates: CalendarWorkout[], backbonePlanId: string | null): CalendarWorkout | null {
  if (candidates.length === 0) return null;

  const primary = candidates.find((c) => c.planId === backbonePlanId) ?? candidates[0];
  const others = candidates.filter((c) => c !== primary);
  if (others.length === 0) return { ...primary, servesRaces: [primary.raceName] };

  let merged = { ...primary };

  for (const other of others) {
    const sameType = other.workoutType === merged.workoutType;
    const bothVolume = VOLUME_TYPES.has(other.workoutType) && VOLUME_TYPES.has(merged.workoutType);

    if ((sameType || bothVolume) && (other.targetDistanceMiles ?? 0) > (merged.targetDistanceMiles ?? 0)) {
      merged = {
        ...merged,
        workoutType: other.workoutType,
        targetDistanceMiles: other.targetDistanceMiles,
        description: other.description,
      };
      continue;
    }

    if (merged.workoutType === "EASY" && QUALITY_TYPES.has(other.workoutType)) {
      merged = {
        ...merged,
        workoutType: other.workoutType,
        targetDistanceMiles: other.targetDistanceMiles,
        description: other.description,
      };
    }
  }

  // Ordered by how the plans were prioritised, so the goal race reads first.
  const servesRaces = [primary.raceName, ...others.map((o) => o.raceName)].filter(
    (name, i, all) => all.indexOf(name) === i
  );

  return { ...merged, servesRaces };
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
  // Phase is tracked for every plan, not just the backbone -- two races in
  // different phases on the same day is the normal case, and each needs its
  // own bar.
  const phaseByPlanDate = new Map<string, Map<string, TrainingPhase>>();

  for (const plan of plans) {
    const meta = planMeta.find((m) => m.planId === plan.id)!;
    const covered = new Set<string>();
    coveredDatesByPlan.set(plan.id, covered);
    const phases = new Map<string, TrainingPhase>();
    phaseByPlanDate.set(plan.id, phases);

    for (const workout of plan.plannedWorkouts) {
      const key = dateKey(workout.date);
      covered.add(key);
      phases.set(key, workout.phase);

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
        servesRaces: [meta.raceName],
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

    const backboneCoversDate = backbonePlanId
      ? (coveredDatesByPlan.get(backbonePlanId)?.has(key) ?? false)
      : false;
    const backboneHasSession = candidates.some((c) => c.planId === backbonePlanId);
    const isRestDay = backboneCoversDate && !backboneHasSession;

    // A rest day the backbone prescribed stands, and nothing is scheduled on
    // a race day -- otherwise every race's ask for the day collapses into the
    // one session that best serves all of them.
    let workout: CalendarWorkout | null =
      (isRestDay && candidates.length > 0) || raceDays.length > 0
        ? null
        : mergeDaySessions(candidates, backbonePlanId);

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
      isRestDay,
      adjustment,
      actualMiles: actualByDate.get(key) ?? null,
    };
  });

  const weeks: CalendarWeek[] = Array.from({ length: weekCount }, (_, i) => {
    const weekDays = days.slice(i * 7, i * 7 + 7);
    const phaseSegments: WeekPhaseSegment[] = [];

    // Collapse each plan's seven days into runs of the same phase. Days the
    // plan doesn't cover (it hasn't started, or has already raced) break a
    // run rather than extending it, so a bar never implies training that
    // isn't scheduled.
    for (const meta of planMeta) {
      const phases = phaseByPlanDate.get(meta.planId);
      if (!phases) continue;

      let runPhase: TrainingPhase | null = null;
      let runStart = 0;

      const flush = (endExclusive: number) => {
        if (runPhase !== null) {
          phaseSegments.push({
            planId: meta.planId,
            raceName: meta.raceName,
            phase: runPhase,
            startIndex: runStart,
            span: endExclusive - runStart,
          });
        }
        runPhase = null;
      };

      weekDays.forEach((day, index) => {
        const phase = phases.get(dateKey(day.date)) ?? null;
        if (phase !== runPhase) {
          flush(index);
          if (phase !== null) {
            runPhase = phase;
            runStart = index;
          }
        }
      });
      flush(weekDays.length);
    }

    return { weekStart: grid[i * 7], days: weekDays, phaseSegments };
  });

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
