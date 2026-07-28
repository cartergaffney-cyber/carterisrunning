import Link from "next/link";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";

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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No runs yet. Connect Strava and hit &ldquo;Sync Strava&rdquo; to pull in your history.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Distance</th>
            <th className="py-2 pr-4">Duration</th>
            <th className="py-2 pr-4">Pace</th>
            <th className="py-2 pr-4">Plan</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 pr-4">
                <Link href={`/runs/${run.id}`} className="hover:underline">
                  {run.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Link>
              </td>
              <td className="py-2 pr-4">{run.name ?? "—"}</td>
              <td className="py-2 pr-4">{run.distanceMiles.toFixed(2)} mi</td>
              <td className="py-2 pr-4">{formatDuration(run.durationSeconds)}</td>
              <td className="py-2 pr-4">{formatPaceSecondsPerMile(run.avgPaceSecondsPerMile)}</td>
              <td className="py-2 pr-4">
                {run.plannedWorkoutId ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Linked
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">Unlinked</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
