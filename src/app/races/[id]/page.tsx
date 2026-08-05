import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { PlanViewSwitcher } from "@/components/plan/PlanViewSwitcher";
import { CoachNoteBanner } from "@/components/coaching/CoachNoteBanner";
import { DISTANCE_LABELS } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";
import { buildWeeksFromPlan } from "@/lib/plan-view/build-weeks";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";

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

  const weeks = buildWeeksFromPlan(plan.plannedWorkouts);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {plan.race?.name ?? DISTANCE_LABELS[plan.raceDistance as RaceDistance]}
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

      {activeCoachNote && (
        <CoachNoteBanner id={activeCoachNote.id} message={activeCoachNote.message} helpful={activeCoachNote.helpful} />
      )}

      <PlanViewSwitcher weeks={weeks} />
    </div>
  );
}
