import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { DISTANCE_LABELS } from "@/lib/plan-generator";
import type { RaceDistance } from "@/lib/plan-generator";
import { buildWeeksFromPlan } from "@/lib/plan-view/build-weeks";
import { PlanTile } from "@/components/plan/PlanTile";

export default async function PlansIndexPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const plans = await prisma.trainingPlan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      race: true,
      plannedWorkouts: {
        orderBy: { date: "asc" },
        include: { run: true, clubSuggestion: { include: { clubSession: true } }, generatedRoute: true },
      },
    },
  });

  const activePlans = plans.filter((p) => p.status === "ACTIVE");
  const otherPlans = plans.filter((p) => p.status !== "ACTIVE");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <Link
          href="/plan/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover"
        >
          Start a new plan
        </Link>
      </div>

      {activePlans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active plans yet.{" "}
          <Link href="/plan/new" className="text-accent underline">
            Set one up
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {activePlans.map((plan) => (
            <PlanTile
              key={plan.id}
              planId={plan.id}
              title={plan.race?.name ?? `${DISTANCE_LABELS[plan.raceDistance as RaceDistance]} Training Plan`}
              raceDistanceLabel={DISTANCE_LABELS[plan.raceDistance as RaceDistance]}
              raceDate={plan.raceDate}
              totalWeeks={plan.totalWeeks}
              defaultExpanded={activePlans.length === 1}
              weeks={buildWeeksFromPlan(plan.plannedWorkouts)}
            />
          ))}
        </div>
      )}

      {otherPlans.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h2 className="text-sm font-medium text-muted-foreground">Archived</h2>
          <div className="flex flex-col gap-1">
            {otherPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/plan/${plan.id}`}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                {plan.race?.name ?? DISTANCE_LABELS[plan.raceDistance as RaceDistance]} &middot; race day{" "}
                {plan.raceDate.toLocaleDateString(undefined, { dateStyle: "medium", timeZone: "UTC" })}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
