import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { deriveTrainingPaces, DISTANCE_MILES } from "@/lib/plan-generator";
import { describeWorkout } from "@/lib/plan-generator/workout-builder";
import { shouldPreferConciseVariant } from "@/lib/coaching/note-feedback";
import { today } from "@/lib/utils/date";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";
import type { RaceDistance, TrainingPaces, WorkoutType } from "@/lib/plan-generator/types";

const updateGoalSchema = z.object({
  goalTimeSeconds: z.number().int().positive().nullable(),
});

const PACE_FIELD_BY_WORKOUT_TYPE: Partial<Record<WorkoutType, keyof TrainingPaces>> = {
  EASY: "easyPaceSecondsPerMile",
  TEMPO: "tempoPaceSecondsPerMile",
  INTERVAL: "intervalPaceSecondsPerMile",
  RACE_PACE: "racePaceSecondsPerMile",
  LONG_RUN: "longRunPaceSecondsPerMile",
  BACK_TO_BACK_LONG: "longRunPaceSecondsPerMile",
};

/**
 * `concise` is driven by thumbs-down feedback on past GOAL_UPDATED notes
 * (see note-feedback.ts) -- once a user (or the user base overall) has
 * voted a majority of these unhelpful, drop the explanatory clause and
 * just state the fact.
 */
function buildGoalUpdateMessage(goalTimeSeconds: number | null, paces: TrainingPaces | null, concise: boolean): string {
  if (!goalTimeSeconds) {
    return concise
      ? "Goal time cleared."
      : "Goal time cleared. Training paces will be based on your recent Strava fitness instead of a fixed target.";
  }
  const formatted = formatDuration(goalTimeSeconds);
  if (!paces) {
    return concise
      ? `Goal time updated to ${formatted}.`
      : `Goal time updated to ${formatted}. Training paces couldn't be calculated yet -- sync more runs so there's enough fitness data.`;
  }
  const racePace = formatPaceSecondsPerMile(paces.racePaceSecondsPerMile);
  return concise
    ? `Goal time updated to ${formatted} (race pace ${racePace}).`
    : `Goal time updated to ${formatted} (race pace ${racePace}). Training paces have been recalculated across your remaining workouts.`;
}

/**
 * Updates only the goal finish time on an existing plan and recalculates
 * training paces from it -- deliberately scoped to just the goal, not race
 * distance or race day, since those are structural to the whole plan (week
 * count, phase lengths, taper). Changing them means starting a new plan
 * (POST /api/plans already archives the previous active one automatically).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await prisma.trainingPlan.findUnique({ where: { id }, include: { fitnessSnapshot: true } });
  if (!plan || plan.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { goalTimeSeconds } = parsed.data;
  const raceDistance = plan.raceDistance as RaceDistance;

  const newPaces = deriveTrainingPaces({
    raceDistance,
    raceDistanceMiles: DISTANCE_MILES[raceDistance],
    goalTimeSeconds: goalTimeSeconds ?? undefined,
    fitnessSnapshot: plan.fitnessSnapshot
      ? {
          avgWeeklyMileageMiles: plan.fitnessSnapshot.avgWeeklyMileageMiles,
          riegelEstimatedPaceSecondsPerMile: plan.fitnessSnapshot.riegelEstimatedPaceSecondsPerMile,
        }
      : null,
  });

  await prisma.$transaction(async (tx) => {
    await tx.trainingPlan.update({
      where: { id: plan.id },
      data: {
        goalTimeSeconds: goalTimeSeconds ?? null,
        paceBasis: newPaces?.paceBasis,
        easyPaceSecondsPerMile: newPaces?.easyPaceSecondsPerMile,
        tempoPaceSecondsPerMile: newPaces?.tempoPaceSecondsPerMile,
        intervalPaceSecondsPerMile: newPaces?.intervalPaceSecondsPerMile,
        longRunPaceSecondsPerMile: newPaces?.longRunPaceSecondsPerMile,
        racePaceSecondsPerMile: newPaces?.racePaceSecondsPerMile,
      },
    });

    if (!newPaces) return;

    const futureWorkouts = await tx.plannedWorkout.findMany({
      where: { trainingPlanId: plan.id, date: { gte: today() }, workoutType: { not: "RACE" }, run: null },
    });

    for (const workout of futureWorkouts) {
      const workoutType = workout.workoutType as WorkoutType;
      const paceKey = PACE_FIELD_BY_WORKOUT_TYPE[workoutType];
      const newPace = paceKey ? (newPaces[paceKey] as number) : workout.targetPaceSecondsPerMile;

      await tx.plannedWorkout.update({
        where: { id: workout.id },
        data: {
          targetPaceSecondsPerMile: newPace,
          description: describeWorkout(
            workoutType,
            workout.targetDistanceMiles ?? undefined,
            workout.targetDurationMinutes ?? undefined,
            newPace ?? undefined
          ),
        },
      });
    }
  });

  const concise = await shouldPreferConciseVariant(user.id, "GOAL_UPDATED");

  await prisma.coachNote.create({
    data: {
      userId: user.id,
      trainingPlanId: plan.id,
      kind: "GOAL_UPDATED",
      message: buildGoalUpdateMessage(goalTimeSeconds, newPaces, concise),
    },
  });

  return NextResponse.json({ ok: true, paces: newPaces });
}
