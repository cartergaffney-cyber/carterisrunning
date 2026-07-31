import Link from "next/link";
import { RouteAction } from "./RouteAction";
import { CoachCommentaryText } from "./CoachCommentaryText";
import { WORKOUT_TYPE_LABELS } from "@/lib/plan-generator/labels";
import type { WorkoutType } from "@/lib/plan-generator/types";
import { Badge } from "@/components/ui/Badge";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";
import type { ComparisonStatus } from "./types";

const ROUTE_ELIGIBLE_TYPES = new Set(["LONG_RUN", "BACK_TO_BACK_LONG"]);

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

const STATUS_LABELS: Record<ComparisonStatus, string> = {
  ON_TARGET: "On Target",
  TOO_HARD: "Too Hard",
  TOO_EASY: "Too Easy",
};

const STATUS_TONES: Record<ComparisonStatus, "success" | "danger" | "warning"> = {
  ON_TARGET: "success",
  TOO_HARD: "danger",
  TOO_EASY: "warning",
};

interface WorkoutCardProps {
  id: string;
  date: Date;
  workoutType: string;
  description: string;
  completed: boolean;
  missed?: boolean;
  runId?: string | null;
  actualDistanceMiles?: number | null;
  actualDurationSeconds?: number | null;
  actualPaceSecondsPerMile?: number | null;
  comparisonStatus?: ComparisonStatus | null;
  coachCommentary?: string | null;
  commentaryHelpful?: boolean | null;
  adaptationReason?: string | null;
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
  missed,
  runId,
  actualDistanceMiles,
  actualDurationSeconds,
  actualPaceSecondsPerMile,
  comparisonStatus,
  coachCommentary,
  commentaryHelpful,
  adaptationReason,
  clubSuggestionReason,
  routeStatus,
  routeFileName,
}: WorkoutCardProps) {
  const hasActual = actualDistanceMiles != null && actualPaceSecondsPerMile != null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            WORKOUT_TYPE_COLORS[workoutType] ?? "bg-surface-muted text-muted-foreground"
          }`}
        >
          {WORKOUT_TYPE_LABELS[workoutType as WorkoutType] ?? workoutType}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="text-sm">
          <span className="font-medium text-muted-foreground">Plan:</span> {description}
        </p>
        {hasActual && (
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">Actual:</span> {actualDistanceMiles!.toFixed(1)} mi
            @ {formatPaceSecondsPerMile(actualPaceSecondsPerMile!)}
            {actualDurationSeconds != null && ` · ${formatDuration(actualDurationSeconds)}`}
          </p>
        )}
      </div>

      {clubSuggestionReason && (
        <p className="text-xs text-violet-600 dark:text-violet-400">Club suggestion: {clubSuggestionReason}</p>
      )}

      {adaptationReason && (
        <div className="flex flex-col gap-1 rounded-md bg-sky-500/10 p-2">
          <span className="text-xs font-medium text-sky-700 dark:text-sky-400">Plan adjusted</span>
          <p className="text-xs text-sky-700/90 dark:text-sky-400/90">{adaptationReason}</p>
        </div>
      )}

      {missed && <Badge tone="danger">Missed</Badge>}

      {completed && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {comparisonStatus ? (
              <Badge tone={STATUS_TONES[comparisonStatus]}>{STATUS_LABELS[comparisonStatus]}</Badge>
            ) : (
              <Badge tone="success">Completed</Badge>
            )}
            {runId && (
              <Link href={`/runs/${runId}`} className="text-xs font-medium text-accent underline">
                View run
              </Link>
            )}
          </div>
          {coachCommentary && (
            <CoachCommentaryText text={coachCommentary} runId={runId ?? null} helpful={commentaryHelpful ?? null} />
          )}
        </div>
      )}

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
