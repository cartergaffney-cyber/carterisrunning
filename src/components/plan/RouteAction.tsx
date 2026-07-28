"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RouteActionProps {
  workoutId: string;
  status: string | null;
  fileName: string | null;
  isBackup: boolean;
}

export function RouteAction({ workoutId, status, fileName, isBackup }: RouteActionProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/route`, { method: "POST" });
      const data = await response.json();

      if (!response.ok || data.status === "FAILED") {
        setError(data.errorMessage ?? "Failed to generate route.");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to generate route.");
    } finally {
      setGenerating(false);
    }
  }

  if (status === "READY" && fileName) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={`/api/workouts/${workoutId}/route`}
          className="text-xs font-medium text-blue-600 underline dark:text-blue-400"
        >
          {isBackup ? "Download backup route" : "Download route"}
        </a>
        <button
          onClick={generate}
          disabled={generating}
          className="text-xs text-zinc-400 underline disabled:opacity-50"
        >
          {generating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={generate}
        disabled={generating}
        className="w-fit text-xs font-medium text-blue-600 underline disabled:opacity-50 dark:text-blue-400"
      >
        {generating ? "Generating route..." : status === "FAILED" ? "Retry route generation" : "Generate route"}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
