import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DISTANCE_LABELS } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";
import { StravaSyncButton } from "@/components/strava/StravaSyncButton";
import { StatTile } from "@/components/dashboard/StatTile";
import { WeeklyMileageChart } from "@/components/dashboard/WeeklyMileageChart";
import { PaceTrendChart } from "@/components/dashboard/PaceTrendChart";
import { AdherenceChart } from "@/components/dashboard/AdherenceChart";
import {
  computeAdherenceSeries,
  computeOverallAdherencePct,
  computePaceTrendSeries,
  computeWeeklyMileageSeries,
} from "@/lib/stats/aggregate";
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Log out
          </button>
        </form>
      </div>

      <StravaSyncButton />

      {activePlan ? (
        <Link
          href={`/plan/${activePlan.id}`}
          className="flex max-w-sm flex-col gap-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active plan</span>
          <span className="text-lg font-semibold">
            {DISTANCE_LABELS[activePlan.raceDistance as RaceDistance]}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Race day {activePlan.raceDate.toLocaleDateString(undefined, { dateStyle: "long" })}
          </span>
        </Link>
      ) : (
        <Link
          href="/plan/new"
          className="flex max-w-sm items-center justify-center rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Set up a training plan
        </Link>
      )}

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
          subtitle={activePlan?.raceDate.toLocaleDateString(undefined, { dateStyle: "medium" })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Weekly mileage</h2>
        <WeeklyMileageChart data={weeklyMileageSeries} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Pace trend</h2>
        <PaceTrendChart data={paceTrendSeries} />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Plan adherence</h2>
        <AdherenceChart data={adherenceSeries} />
      </div>
    </div>
  );
}
