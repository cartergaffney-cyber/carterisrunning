import { compareRunToWorkout } from "@/lib/coaching/compare-run";
import { today } from "@/lib/utils/date";
import type { WorkoutType } from "@/lib/plan-generator/types";
import type { WeekData, WorkoutData } from "@/components/plan/types";
import type { Prisma } from "@/generated/prisma/client";

const UNGRADED_TYPES = new Set<string>(["REST", "CROSS_TRAIN"]);

export type PlannedWorkoutWithRelations = Prisma.PlannedWorkoutGetPayload<{
  include: { run: true; clubSuggestion: { include: { clubSession: true } }; generatedRoute: true };
}>;

/** Shared by the single-plan page and the plans index so both render workouts identically. */
export function buildWeeksFromPlan(plannedWorkouts: PlannedWorkoutWithRelations[]): WeekData[] {
  const now = today();
  const weeksByNumber = new Map<number, WeekData>();

  for (const workout of plannedWorkouts) {
    const workoutType = workout.workoutType as WorkoutType;
    const comparisonStatus = workout.run
      ? (compareRunToWorkout(workout.run, {
          workoutType,
          targetDistanceMiles: workout.targetDistanceMiles,
          targetDurationMinutes: workout.targetDurationMinutes,
          targetPaceSecondsPerMile: workout.targetPaceSecondsPerMile,
        })?.status ?? null)
      : null;

    const missed = !workout.completed && !UNGRADED_TYPES.has(workoutType) && workout.date.getTime() < now.getTime();

    const workoutData: WorkoutData = {
      id: workout.id,
      date: workout.date,
      workoutType: workout.workoutType,
      description: workout.description,
      completed: workout.completed,
      missed,
      targetDistanceMiles: workout.targetDistanceMiles,
      runId: workout.run?.id ?? null,
      actualDistanceMiles: workout.run?.distanceMiles ?? null,
      actualDurationSeconds: workout.run?.durationSeconds ?? null,
      actualPaceSecondsPerMile: workout.run?.avgPaceSecondsPerMile ?? null,
      comparisonStatus,
      coachCommentary: workout.run?.coachCommentary ?? null,
      commentaryHelpful: workout.run?.commentaryHelpful ?? null,
      adaptationReason: workout.adaptationReason,
      clubSuggestionReason: workout.clubSuggestion?.matchReason ?? null,
      routeStatus: workout.generatedRoute?.status ?? null,
      routeFileName: workout.generatedRoute?.fileName ?? null,
    };

    const existing = weeksByNumber.get(workout.weekNumber);
    if (existing) {
      existing.workouts.push(workoutData);
    } else {
      weeksByNumber.set(workout.weekNumber, {
        weekNumber: workout.weekNumber,
        phase: workout.phase,
        isStepBack: workout.isStepBack,
        workouts: [workoutData],
      });
    }
  }

  return Array.from(weeksByNumber.values()).sort((a, b) => a.weekNumber - b.weekNumber);
}
