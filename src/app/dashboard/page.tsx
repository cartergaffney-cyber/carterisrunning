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
import { buildCalendarRange, sundayOfWeek } from "@/lib/calendar/build-calendar";
import { TodayPanel } from "@/components/dashboard/TodayPanel";

const STATS_WEEKS_BACK = 12;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "there";

  // Soonest race day, not most-recently-created -- with several races on the
  // calendar at once, "your next race" is the one actually coming up next.
  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { raceDate: "asc" },
    include: { plannedWorkouts: true, race: true },
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

  // The merged view, so today's panel reflects every active race at once
  // rather than whichever plan happens to be soonest.
  const calendar = await buildCalendarRange(user.id, sundayOfWeek(today()), 1);
  const todayCell = calendar.weeks[0]?.days.find((day) => day.isToday) ?? null;
  const weekdayLabel = today().toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-8 py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-[clamp(26px,4vw,34px)]">Welcome, {name}</h1>
        <div className="flex items-center gap-5">
          <span className="metric text-[13px] tracking-[0.08em] text-faint-foreground">
            {weekdayLabel.toUpperCase()}
          </span>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="brand-label rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-[rgba(255,255,255,0.05)]"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      {activeCoachNote && (
        <CoachNoteBanner id={activeCoachNote.id} message={activeCoachNote.message} helpful={activeCoachNote.helpful} />
      )}

      {todayCell && <TodayPanel day={todayCell} />}

      <div className="flex flex-wrap items-center gap-3">
        <StravaSyncButton />

        {activePlan ? (
          <div className="flex flex-1 min-w-64 max-w-sm flex-col gap-3 rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/races/${activePlan.id}`} className="flex flex-col gap-0.5 hover:text-accent">
                <span className="text-xs font-medium text-muted-foreground">
                  {activePlanCount > 1 ? "Next race" : "Your race"}
                </span>
                <span className="text-[20px]">
                  {activePlan.race?.name ?? DISTANCE_LABELS[activePlan.raceDistance as RaceDistance]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {DISTANCE_LABELS[activePlan.raceDistance as RaceDistance]} &middot;{" "}
                  {activePlan.raceDate.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" })}
                </span>
              </Link>
              <div className="flex flex-col items-end gap-1">
                {activePlanCount > 1 && (
                  <Link href="/races" className="text-xs font-medium text-accent underline">
                    View all {activePlanCount} races
                  </Link>
                )}
                <Link href="/races/new" className="text-xs font-medium text-muted-foreground underline hover:text-foreground">
                  Add a race
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
            href="/races/new"
            className="flex items-center justify-center rounded-full bg-accent px-5 py-3 text-base font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
          >
            Add your first race
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="This week"
          value={thisWeek.actualMiles.toFixed(1)}
          unit={activePlan ? ` / ${thisWeek.targetMiles.toFixed(1)} mi` : " mi"}
          progress={activePlan && thisWeek.targetMiles > 0 ? thisWeek.actualMiles / thisWeek.targetMiles : undefined}
          subtitle={activePlan ? undefined : "no race scheduled"}
        />
        <StatTile
          label="Plan adherence"
          value={overallAdherencePct !== null ? String(Math.round(overallAdherencePct)) : "—"}
          unit={overallAdherencePct !== null ? "%" : undefined}
          subtitle={activePlan ? `last ${STATS_WEEKS_BACK} weeks` : "no race scheduled"}
        />
        <StatTile
          label="Days to race"
          value={daysToRace !== null ? String(daysToRace) : "—"}
          tone="accent"
          subtitle={activePlan?.raceDate.toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}
        />
      </div>

      <PerformancePredictor predictions={performancePredictions} />

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-[20px] leading-none">Weekly mileage</h2>
          <WeeklyMileageChart data={weeklyMileageSeries} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-[20px] leading-none">Pace trend</h2>
          <PaceTrendChart data={paceTrendSeries} />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-[20px] leading-none">Plan adherence</h2>
          <AdherenceChart data={adherenceSeries} />
        </Card>
      </div>
    </div>
  );
}
