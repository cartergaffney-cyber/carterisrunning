import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createPlanSchema } from "@/lib/validation/schemas";
import { generatePlan } from "@/lib/plan-generator";
import { computeFitnessSnapshot, persistFitnessSnapshot } from "@/lib/fitness-assessment";
import { matchWorkoutsToClubSessions } from "@/lib/clubs/matching";
import { parseLocalDate, today } from "@/lib/utils/date";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.trainingPlan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { raceDistance, raceDate, currentWeeklyMileageMiles, goalTimeSeconds, raceId } = parsed.data;

  const fitnessSnapshotData = await computeFitnessSnapshot(user.id);
  const fitnessSnapshotRow = await persistFitnessSnapshot(user.id, fitnessSnapshotData);

  const generated = generatePlan({
    raceDistance,
    raceDate: parseLocalDate(raceDate),
    startDate: today(),
    currentWeeklyMileageMiles,
    goalTimeSeconds,
    fitnessSnapshot: {
      avgWeeklyMileageMiles: fitnessSnapshotData.avgWeeklyMileageMiles,
      riegelEstimatedPaceSecondsPerMile: fitnessSnapshotData.riegelEstimatedPaceSecondsPerMile,
    },
  });

  const plannedWorkouts = generated.weeks.flatMap((week) =>
    week.workouts.map((workout) => ({
      weekNumber: week.weekNumber,
      date: workout.date,
      phase: week.phase,
      isStepBack: week.isStepBack,
      workoutType: workout.workoutType,
      targetDistanceMiles: workout.targetDistanceMiles,
      targetDurationMinutes: workout.targetDurationMinutes,
      targetPaceSecondsPerMile: workout.targetPaceSecondsPerMile,
      description: workout.description,
    }))
  );

  const plan = await prisma.trainingPlan.create({
    data: {
      userId: user.id,
      raceId,
      raceDistance,
      raceDate: parseLocalDate(raceDate),
      startDate: today(),
      currentWeeklyMileageMiles,
      goalTimeSeconds,
      totalWeeks: generated.totalWeeks,
      fitnessSnapshotId: fitnessSnapshotRow.id,
      paceBasis: generated.paces?.paceBasis,
      easyPaceSecondsPerMile: generated.paces?.easyPaceSecondsPerMile,
      tempoPaceSecondsPerMile: generated.paces?.tempoPaceSecondsPerMile,
      intervalPaceSecondsPerMile: generated.paces?.intervalPaceSecondsPerMile,
      longRunPaceSecondsPerMile: generated.paces?.longRunPaceSecondsPerMile,
      racePaceSecondsPerMile: generated.paces?.racePaceSecondsPerMile,
      plannedWorkouts: { create: plannedWorkouts },
    },
  });

  const matchedCount = await matchWorkoutsToClubSessions(plan.id);

  return NextResponse.json(
    { id: plan.id, warnings: generated.warnings, clubMatches: matchedCount },
    { status: 201 }
  );
}
