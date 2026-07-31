import { WorkoutCard } from "./WorkoutCard";
import { Badge } from "@/components/ui/Badge";
import type { WeekData } from "./types";

const PHASE_LABELS: Record<string, string> = {
  BASE: "Base",
  BUILD: "Build",
  PEAK: "Peak",
  TAPER: "Taper",
};

export function PlanListView({ weeks }: { weeks: WeekData[] }) {
  return (
    <div className="flex flex-col gap-8">
      {weeks.map((week) => {
        const weeklyMileage = week.workouts.reduce((sum, w) => sum + (w.targetDistanceMiles ?? 0), 0);
        return (
          <section key={week.weekNumber} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Week {week.weekNumber}</h2>
              <Badge>{PHASE_LABELS[week.phase] ?? week.phase}</Badge>
              {week.isStepBack && <Badge tone="info">Step-back</Badge>}
              <span className="text-xs text-muted-foreground">~{weeklyMileage.toFixed(1)} mi</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {week.workouts.map((workout) => (
                <WorkoutCard key={workout.id} {...workout} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
