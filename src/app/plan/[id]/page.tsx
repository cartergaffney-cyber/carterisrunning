import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { PlanViewSwitcher } from "@/components/plan/PlanViewSwitcher";
import { DISTANCE_LABELS } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const plan = await prisma.trainingPlan.findUnique({
    where: { id },
    include: {
      plannedWorkouts: {
        orderBy: { date: "asc" },
        include: { run: true, clubSuggestion: { include: { clubSession: true } }, generatedRoute: true },
      },
    },
  });

  if (!plan || plan.userId !== user.id) {
    notFound();
  }

  type WorkoutWithExtras = (typeof plan.plannedWorkouts)[number] & {
    runId: string | null;
    clubSuggestionReason: string | null;
    routeStatus: string | null;
    routeFileName: string | null;
  };

  const weeksByNumber = new Map<
    number,
    { weekNumber: number; phase: string; isStepBack: boolean; workouts: WorkoutWithExtras[] }
  >();

  for (const workout of plan.plannedWorkouts) {
    const workoutWithExtras: WorkoutWithExtras = {
      ...workout,
      runId: workout.run?.id ?? null,
      clubSuggestionReason: workout.clubSuggestion?.matchReason ?? null,
      routeStatus: workout.generatedRoute?.status ?? null,
      routeFileName: workout.generatedRoute?.fileName ?? null,
    };
    const existing = weeksByNumber.get(workout.weekNumber);
    if (existing) {
      existing.workouts.push(workoutWithExtras);
    } else {
      weeksByNumber.set(workout.weekNumber, {
        weekNumber: workout.weekNumber,
        phase: workout.phase,
        isStepBack: workout.isStepBack,
        workouts: [workoutWithExtras],
      });
    }
  }

  const weeks = Array.from(weeksByNumber.values()).sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {DISTANCE_LABELS[plan.raceDistance as RaceDistance]} Training Plan
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Race day {plan.raceDate.toLocaleDateString(undefined, { dateStyle: "long" })} &middot; {plan.totalWeeks}{" "}
          weeks &middot; {plan.status}
        </p>
      </div>

      <PlanViewSwitcher weeks={weeks} />
    </div>
  );
}
