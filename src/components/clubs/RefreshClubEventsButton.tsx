"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface RefreshResult {
  clubsProcessed: number;
  sessionsAdded: number;
  sessionsUpdated: number;
  remaining: number;
  rateLimited: boolean;
}

function describe(result: RefreshResult): string {
  if (result.rateLimited) {
    return "Strava's rate limit was hit — wait a few minutes, then refresh again.";
  }
  if (result.clubsProcessed === 0) {
    return "All clubs are up to date.";
  }

  const found = result.sessionsAdded + result.sessionsUpdated;
  const checked = `Checked ${result.clubsProcessed} club${result.clubsProcessed === 1 ? "" : "s"}`;
  const sessions =
    found === 0
      ? "no recurring events posted"
      : `${found} recurring session${found === 1 ? "" : "s"} found`;
  const more = result.remaining > 0 ? ` · ${result.remaining} still to check — refresh again` : "";

  return `${checked}: ${sessions}.${more}`;
}

export function RefreshClubEventsButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleRefresh() {
    setRefreshing(true);
    setStatus(null);
    try {
      const response = await fetch("/api/clubs/refresh-events", { method: "POST" });
      if (!response.ok) {
        setStatus("Couldn't reach Strava just now — try again in a moment.");
        return;
      }
      setStatus(describe((await response.json()) as RefreshResult));
      router.refresh();
    } catch {
      setStatus("Couldn't reach Strava just now — try again in a moment.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" onClick={handleRefresh} disabled={refreshing}>
        {refreshing ? "Checking Strava…" : "Refresh club events"}
      </Button>
      {status && <span className="text-xs text-muted-foreground">{status}</span>}
    </div>
  );
}
