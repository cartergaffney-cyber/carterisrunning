"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StravaSyncButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/strava/sync", { method: "POST" });
      if (!response.ok) {
        setError("Sync failed. Please try again.");
        return;
      }
      const { created, updated, linked } = await response.json();
      setResult(`Synced: ${created} new, ${updated} updated, ${linked} linked to workouts.`);
      router.refresh();
    } catch {
      setError("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: "#FC4C02" }}
      >
        {syncing ? "Syncing..." : "Sync Strava"}
      </button>
      {result && <p className="text-xs text-zinc-500 dark:text-zinc-400">{result}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
