import { Card } from "@/components/ui/Card";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";
import type { DistancePrediction, PerformancePredictions } from "@/lib/fitness-assessment/performance-predictor";

function DeltaBadge({ improvedBySeconds }: { improvedBySeconds: number | null }) {
  if (improvedBySeconds == null || improvedBySeconds === 0) return null;

  const improved = improvedBySeconds > 0;
  const magnitude = formatDuration(Math.abs(improvedBySeconds));

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        improved
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      }`}
    >
      {improved ? "▼" : "▲"} {magnitude}
    </span>
  );
}

function DistanceTile({ prediction }: { prediction: DistancePrediction }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
      <span className="text-xs font-medium text-muted-foreground">{prediction.label}</span>
      <span className="text-xl font-semibold tracking-tight">{formatDuration(prediction.predictedSeconds)}</span>
      <span className="text-xs text-muted-foreground">{formatPaceSecondsPerMile(prediction.paceSecondsPerMile)}</span>
      <DeltaBadge improvedBySeconds={prediction.improvedBySecondsVsMonthAgo} />
    </div>
  );
}

export function PerformancePredictor({ predictions }: { predictions: PerformancePredictions | null }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Performance predictions</h2>
        <p className="text-xs text-muted-foreground">
          Projected from your recent best effort using the Riegel formula -- a rough estimate, not a guarantee.
          {predictions?.bestRecentEffortDate &&
            ` Based on your best timed effort in the last ${predictions.windowWeeks} weeks (${predictions.bestRecentEffortDate.toLocaleDateString(
              undefined,
              { dateStyle: "medium", timeZone: "UTC" }
            )}).`}
        </p>
      </div>

      {predictions ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {predictions.predictions.map((p) => (
            <DistanceTile key={p.key} prediction={p} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sync a few timed runs from Strava to see predicted times for 5K, 10K, Half Marathon, and Marathon.
        </p>
      )}
    </Card>
  );
}
