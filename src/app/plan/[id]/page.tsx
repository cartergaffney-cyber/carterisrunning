import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { PlanViewSwitcher } from "@/components/plan/PlanViewSwitcher";
import { CoachNoteBanner } from "@/components/coaching/CoachNoteBanner";
import { DISTANCE_LABELS } from "@/lib/plan-generator";
import type { RaceDistance, WorkoutType } from "@/lib/plan-generator";
import { compareRunToWorkout } from "@/lib/coaching/compare-run";
import { today } from "@/lib/utils/date";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";
import type { WeekData, WorkoutData } from "@/components/plan/types";

const UNGRADED_TYPES = new Set<string>(["REST", "CROSS_TRAIN"]);

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const plan = await prisma.trainingPlan.findUnique({
    where: { id },
    include: {
      race: true,
      plannedWorkouts: {
        orderBy: { date: "asc" },
        include: { run: true, clubSuggestion: { include: { clubSession: true } }, generatedRoute: true },
      },
    },
  });

  if (!plan || plan.userId !== user.id) {
    notFound();
  }

  const activeCoachNote = await prisma.coachNote.findFirst({
    where: { userId: user.id, trainingPlanId: plan.id, dismissedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const now = today();
  const weeksByNumber = new Map<number, WeekData>();

  for (const workout of plan.plannedWorkouts) {
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

  const weeks = Array.from(weeksByNumber.values()).sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {plan.race?.name ?? `${DISTANCE_LABELS[plan.raceDistance as RaceDistance]} Training Plan`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {DISTANCE_LABELS[plan.raceDistance as RaceDistance]} &middot; Race day{" "}
          {plan.raceDate.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" })} &middot;{" "}
          {plan.totalWeeks} weeks &middot; {plan.status}
        </p>
        {(plan.goalTimeSeconds || plan.racePaceSecondsPerMile) && (
          <p className="text-sm text-muted-foreground">
            Goal: {plan.goalTimeSeconds ? formatDuration(plan.goalTimeSeconds) : "no time goal"}
            {plan.racePaceSecondsPerMile ? ` (${formatPaceSecondsPerMile(plan.racePaceSecondsPerMile)} goal pace)` : ""}
          </p>
        )}
      </div>

      {activeCoachNote && <CoachNoteBanner id={activeCoachNote.id} message={activeCoachNote.message} />}

      <PlanViewSwitcher weeks={weeks} />
    </div>
  );
}
