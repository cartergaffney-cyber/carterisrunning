"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface CandidateWorkout {
  id: string;
  date: string; // ISO
  workoutType: string;
  description: string;
  linkedToOtherRun: boolean;
}

interface LinkWorkoutModalProps {
  runId: string;
  currentPlannedWorkoutId: string | null;
  candidates: CandidateWorkout[];
}

export function LinkWorkoutModal({ runId, currentPlannedWorkoutId, candidates }: LinkWorkoutModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link(plannedWorkoutId: string | null) {
    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/runs/${runId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plannedWorkoutId }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Failed to update link.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (currentPlannedWorkoutId) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">Linked to a planned workout.</p>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button variant="secondary" onClick={() => link(null)} disabled={submitting} className="w-fit">
          {submitting ? "Unlinking…" : "Unlink"}
        </Button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-fit">
        Link to a planned workout
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
      <p className="text-sm font-medium">Link this run to:</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {candidates.length === 0 && <p className="text-sm text-muted-foreground">No nearby planned workouts found.</p>}
      <div className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <button
            key={candidate.id}
            disabled={submitting || candidate.linkedToOtherRun}
            onClick={() => link(candidate.id)}
            className="flex flex-col items-start gap-0.5 rounded-md border border-border p-2 text-left text-sm transition-colors hover:border-accent disabled:opacity-40"
          >
            <span className="text-xs text-muted-foreground">
              {new Date(candidate.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}{" "}
              &middot; {candidate.workoutType}
              {candidate.linkedToOtherRun ? " (already linked)" : ""}
            </span>
            <span>{candidate.description}</span>
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="w-fit text-sm text-muted-foreground underline">
        Cancel
      </button>
    </div>
  );
}
