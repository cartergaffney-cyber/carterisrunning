import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { LinkWorkoutModal } from "@/components/runs/LinkWorkoutModal";
import { StatTile } from "@/components/dashboard/StatTile";
import { addDays } from "@/lib/utils/date";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const run = await prisma.run.findUnique({ where: { id } });
  if (!run || run.userId !== user.id) {
    notFound();
  }

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });

  let candidates: {
    id: string;
    date: string;
    workoutType: string;
    description: string;
    linkedToOtherRun: boolean;
  }[] = [];

  if (activePlan) {
    const nearbyWorkouts = await prisma.plannedWorkout.findMany({
      where: {
        trainingPlanId: activePlan.id,
        workoutType: { not: "REST" },
        date: { gte: addDays(run.date, -3), lte: addDays(run.date, 3) },
      },
      include: { run: true },
      orderBy: { date: "asc" },
    });

    candidates = nearbyWorkouts.map((workout) => ({
      id: workout.id,
      date: workout.date.toISOString(),
      workoutType: workout.workoutType,
      description: workout.description,
      linkedToOtherRun: !!workout.run && workout.run.id !== run.id,
    }));
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{run.name ?? "Run"}</h1>
        <p className="text-sm text-muted-foreground">{run.date.toLocaleDateString(undefined, { dateStyle: "long" })}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Distance" value={`${run.distanceMiles.toFixed(2)} mi`} />
        <StatTile label="Duration" value={formatDuration(run.durationSeconds)} />
        <StatTile label="Pace" value={formatPaceSecondsPerMile(run.avgPaceSecondsPerMile)} />
        {run.elevationGainFeet != null && (
          <StatTile label="Elevation gain" value={`${Math.round(run.elevationGainFeet)} ft`} />
        )}
      </div>

      {activePlan ? (
        <LinkWorkoutModal runId={run.id} currentPlannedWorkoutId={run.plannedWorkoutId} candidates={candidates} />
      ) : (
        <p className="text-sm text-muted-foreground">No active training plan to link against.</p>
      )}
    </div>
  );
}
