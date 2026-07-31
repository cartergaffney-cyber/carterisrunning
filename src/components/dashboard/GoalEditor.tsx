"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatPaceSecondsPerMile } from "@/lib/utils/pace";

interface GoalEditorProps {
  planId: string;
  goalTimeSeconds: number | null;
  racePaceSecondsPerMile: number | null;
}

export function GoalEditor({ planId, goalTimeSeconds, racePaceSecondsPerMile }: GoalEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState(goalTimeSeconds ? String(Math.floor(goalTimeSeconds / 3600)) : "");
  const [minutes, setMinutes] = useState(goalTimeSeconds ? String(Math.floor((goalTimeSeconds % 3600) / 60)) : "");
  const [seconds, setSeconds] = useState(goalTimeSeconds ? String(goalTimeSeconds % 60) : "");

  async function save() {
    setSubmitting(true);
    setError(null);

    const total = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

    const response = await fetch(`/api/plans/${planId}/goal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalTimeSeconds: total > 0 ? total : null }),
    });

    setSubmitting(false);
    if (!response.ok) {
      setError("Failed to update goal.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">Goal</span>
          <span className="text-sm">
            {goalTimeSeconds
              ? `${formatDuration(goalTimeSeconds)}${
                  racePaceSecondsPerMile ? ` (${formatPaceSecondsPerMile(racePaceSecondsPerMile)})` : ""
                }`
              : "No goal time set"}
          </span>
        </div>
        <button onClick={() => setEditing(true)} className="text-xs font-medium text-accent underline">
          Edit goal
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Goal finish time</span>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          placeholder="hh"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="w-14 px-2 py-1 text-sm"
        />
        <Input
          type="number"
          min={0}
          max={59}
          placeholder="mm"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-14 px-2 py-1 text-sm"
        />
        <Input
          type="number"
          min={0}
          max={59}
          placeholder="ss"
          value={seconds}
          onChange={(e) => setSeconds(e.target.value)}
          className="w-14 px-2 py-1 text-sm"
        />
        <Button onClick={save} disabled={submitting} className="px-3 py-1 text-xs">
          Save
        </Button>
        <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground underline">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
