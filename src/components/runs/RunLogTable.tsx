import Link from "next/link";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface RunRow {
  id: string;
  date: Date;
  name: string | null;
  distanceMiles: number;
  durationSeconds: number;
  avgPaceSecondsPerMile: number;
  plannedWorkoutId: string | null;
}

export function RunLogTable({ runs }: { runs: RunRow[] }) {
  if (runs.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">
          No runs yet. Connect Strava and hit &ldquo;Sync Strava&rdquo; to pull in your history.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Distance</th>
            <th className="px-4 py-3 font-medium">Duration</th>
            <th className="px-4 py-3 font-medium">Pace</th>
            <th className="px-4 py-3 font-medium">Plan</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
              <td className="px-4 py-3">
                <Link href={`/runs/${run.id}`} className="hover:underline">
                  {run.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Link>
              </td>
              <td className="px-4 py-3">{run.name ?? "—"}</td>
              <td className="px-4 py-3 tabular-nums">{run.distanceMiles.toFixed(2)} mi</td>
              <td className="px-4 py-3 tabular-nums">{formatDuration(run.durationSeconds)}</td>
              <td className="px-4 py-3 tabular-nums">{formatPaceSecondsPerMile(run.avgPaceSecondsPerMile)}</td>
              <td className="px-4 py-3">
                {run.plannedWorkoutId ? (
                  <Badge tone="success">Linked</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Unlinked</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
