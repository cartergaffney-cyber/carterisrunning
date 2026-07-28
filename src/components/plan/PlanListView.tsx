import { WorkoutCard } from "./WorkoutCard";

interface WorkoutData {
  id: string;
  date: Date;
  workoutType: string;
  description: string;
  completed: boolean;
  targetDistanceMiles: number | null;
  runId: string | null;
  clubSuggestionReason: string | null;
  routeStatus: string | null;
  routeFileName: string | null;
}

interface WeekData {
  weekNumber: number;
  phase: string;
  isStepBack: boolean;
  workouts: WorkoutData[];
}

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
              <h2 className="text-lg font-semibold">Week {week.weekNumber}</h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                {PHASE_LABELS[week.phase] ?? week.phase}
              </span>
              {week.isStepBack && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  Step-back
                </span>
              )}
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                ~{weeklyMileage.toFixed(1)} mi
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {week.workouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  id={workout.id}
                  date={workout.date}
                  workoutType={workout.workoutType}
                  description={workout.description}
                  completed={workout.completed}
                  runId={workout.runId}
                  clubSuggestionReason={workout.clubSuggestionReason}
                  routeStatus={workout.routeStatus}
                  routeFileName={workout.routeFileName}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
