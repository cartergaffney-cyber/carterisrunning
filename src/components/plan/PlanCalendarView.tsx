import { WorkoutCard } from "./WorkoutCard";
import { Badge } from "@/components/ui/Badge";

interface WorkoutData {
  id: string;
  date: Date;
  workoutType: string;
  description: string;
  completed: boolean;
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

export function PlanCalendarView({ weeks }: { weeks: WeekData[] }) {
  return (
    <div className="flex flex-col gap-4">
      {weeks.map((week) => (
        <div key={week.weekNumber} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Week {week.weekNumber}</span>
            <Badge>{PHASE_LABELS[week.phase] ?? week.phase}</Badge>
            {week.isStepBack && <Badge tone="info">Step-back</Badge>}
          </div>
          <div className="grid grid-cols-7 gap-2">
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
        </div>
      ))}
    </div>
  );
}
