import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DISTANCE_LABELS } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";
import { StravaSyncButton } from "@/components/strava/StravaSyncButton";
import { CoachNoteBanner } from "@/components/coaching/CoachNoteBanner";
import { GoalEditor } from "@/components/dashboard/GoalEditor";
import { StatTile } from "@/components/dashboard/StatTile";
import { WeeklyMileageChart } from "@/components/dashboard/WeeklyMileageChart";
import { PaceTrendChart } from "@/components/dashboard/PaceTrendChart";
import { AdherenceChart } from "@/components/dashboard/AdherenceChart";
import { PerformancePredictor } from "@/components/dashboard/PerformancePredictor";
import { Card } from "@/components/ui/Card";
import {
  computeAdherenceSeries,
  computeOverallAdherencePct,
  computePaceTrendSeries,
  computeWeeklyMileageSeries,
} from "@/lib/stats/aggregate";
import { computePerformancePredictions } from "@/lib/fitness-assessment/performance-predictor";
import { addDays, diffInDays, today } from "@/lib/utils/date";

const STATS_WEEKS_BACK = 12;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "there";

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { plannedWorkouts: true },
  });

  const activePlanCount = await prisma.trainingPlan.count({ where: { userId: user.id, status: "ACTIVE" } });

  const activeCoachNote = await prisma.coachNote.findFirst({
    where: { userId: user.id, dismissedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const runs = await prisma.run.findMany({
    where: { userId: user.id, date: { gte: addDays(today(), -STATS_WEEKS_BACK * 7) } },
    select: { date: true, distanceMiles: true, durationSeconds: true },
  });

  const plannedWorkouts = activePlan?.plannedWorkouts ?? [];

  const weeklyMileageSeries = computeWeeklyMileageSeries(runs, plannedWorkouts, STATS_WEEKS_BACK);
  const paceTrendSeries = computePaceTrendSeries(runs, STATS_WEEKS_BACK);
  const adherenceSeries = computeAdherenceSeries(plannedWorkouts);
  const overallAdherencePct = computeOverallAdherencePct(adherenceSeries);

  const thisWeek = weeklyMileageSeries[weeklyMileageSeries.length - 1];
  const daysToRace = activePlan ? diffInDays(today(), activePlan.raceDate) : null;

  const performancePredictions = await computePerformancePredictions(user.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {name}</h1>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted"
          >
            Log out
          </button>
        </form>
      </div>

      {activeCoachNote && (
        <CoachNoteBanner id={activeCoachNote.id} message={activeCoachNote.message} helpful={activeCoachNote.helpful} />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <StravaSyncButton />

        {activePlan ? (
          <div className="flex flex-1 min-w-64 max-w-sm flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/plan/${activePlan.id}`} className="flex flex-col gap-0.5 hover:text-accent">
                <span className="text-xs font-medium text-muted-foreground">
                  {activePlanCount > 1 ? "Most recent plan" : "Active plan"}
                </span>
                <span className="text-lg font-semibold">
                  {DISTANCE_LABELS[activePlan.raceDistance as RaceDistance]}
                </span>
                <span className="text-sm text-muted-foreground">
                  Race day {activePlan.raceDate.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" })}
                </span>
              </Link>
              <div className="flex flex-col items-end gap-1">
                {activePlanCount > 1 && (
                  <Link href="/plan" className="text-xs font-medium text-accent underline">
                    View all {activePlanCount} plans
                  </Link>
                )}
                <Link href="/plan/new" className="text-xs font-medium text-muted-foreground underline hover:text-foreground">
                  Start a new plan
                </Link>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <GoalEditor
                planId={activePlan.id}
                goalTimeSeconds={activePlan.goalTimeSeconds}
                racePaceSecondsPerMile={activePlan.racePaceSecondsPerMile}
              />
            </div>
          </div>
        ) : (
          <Link
            href="/plan/new"
            className="flex items-center justify-center rounded-full bg-accent px-5 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Set up a training plan
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="This week's mileage"
          value={`${thisWeek.actualMiles.toFixed(1)} mi`}
          subtitle={activePlan ? `of ${thisWeek.targetMiles.toFixed(1)} mi planned` : undefined}
        />
        <StatTile
          label="Adherence"
          value={overallAdherencePct !== null ? `${Math.round(overallAdherencePct)}%` : "—"}
          subtitle={activePlan ? `last ${STATS_WEEKS_BACK} weeks` : "no active plan"}
        />
        <StatTile
          label="Days to race"
          value={daysToRace !== null ? String(daysToRace) : "—"}
          subtitle={activePlan?.raceDate.toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}
        />
      </div>

      <PerformancePredictor predictions={performancePredictions} />

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Weekly mileage</h2>
          <WeeklyMileageChart data={weeklyMileageSeries} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Pace trend</h2>
          <PaceTrendChart data={paceTrendSeries} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Plan adherence</h2>
          <AdherenceChart data={adherenceSeries} />
        </Card>
      </div>
    </div>
  );
}
