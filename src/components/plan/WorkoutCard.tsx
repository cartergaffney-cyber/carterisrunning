import Link from "next/link";
import { RouteAction } from "./RouteAction";

const ROUTE_ELIGIBLE_TYPES = new Set(["LONG_RUN", "BACK_TO_BACK_LONG"]);

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  REST: "Rest",
  EASY: "Easy",
  LONG_RUN: "Long Run",
  TEMPO: "Tempo",
  INTERVAL: "Interval",
  RACE_PACE: "Race Pace",
  BACK_TO_BACK_LONG: "Back-to-Back",
  CROSS_TRAIN: "Cross-Train",
  RACE: "RACE DAY",
};

// Deliberately varied hues per workout type for at-a-glance recognition --
// not tied to the app's single accent token, which only carries one meaning.
const WORKOUT_TYPE_COLORS: Record<string, string> = {
  REST: "bg-surface-muted text-muted-foreground",
  EASY: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  LONG_RUN: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  TEMPO: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  INTERVAL: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  RACE_PACE: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  BACK_TO_BACK_LONG: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  CROSS_TRAIN: "bg-surface-muted text-muted-foreground",
  RACE: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
};

interface WorkoutCardProps {
  id: string;
  date: Date;
  workoutType: string;
  description: string;
  completed: boolean;
  runId?: string | null;
  clubSuggestionReason?: string | null;
  routeStatus?: string | null;
  routeFileName?: string | null;
}

export function WorkoutCard({
  id,
  date,
  workoutType,
  description,
  completed,
  runId,
  clubSuggestionReason,
  routeStatus,
  routeFileName,
}: WorkoutCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            WORKOUT_TYPE_COLORS[workoutType] ?? "bg-surface-muted text-muted-foreground"
          }`}
        >
          {WORKOUT_TYPE_LABELS[workoutType] ?? workoutType}
        </span>
      </div>
      <p className="text-sm">{description}</p>
      {clubSuggestionReason && (
        <p className="text-xs text-violet-600 dark:text-violet-400">Club suggestion: {clubSuggestionReason}</p>
      )}
      {completed &&
        (runId ? (
          <Link
            href={`/runs/${runId}`}
            className="text-xs font-medium text-emerald-600 underline dark:text-emerald-400"
          >
            Completed — view run
          </Link>
        ) : (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
        ))}
      {ROUTE_ELIGIBLE_TYPES.has(workoutType) && (
        <RouteAction
          workoutId={id}
          status={routeStatus ?? null}
          fileName={routeFileName ?? null}
          isBackup={!!clubSuggestionReason}
        />
      )}
    </div>
  );
}
