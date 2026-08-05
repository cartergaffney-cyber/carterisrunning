"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlanViewSwitcher } from "./PlanViewSwitcher";
import type { WeekData } from "./types";

interface PlanTileProps {
  planId: string;
  title: string;
  raceDistanceLabel: string;
  raceDate: Date;
  totalWeeks: number;
  defaultExpanded: boolean;
  weeks: WeekData[];
}

export function PlanTile({
  planId,
  title,
  raceDistanceLabel,
  raceDate,
  totalWeeks,
  defaultExpanded,
  weeks,
}: PlanTileProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [archiving, setArchiving] = useState(false);
  const router = useRouter();

  async function handleArchive() {
    if (!confirm(`Archive "${title}"? It'll stop showing here, but nothing is deleted.`)) return;
    setArchiving(true);
    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (response.ok) router.refresh();
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span
            className={`text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▶
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-base font-semibold">{title}</span>
            <span className="text-sm text-muted-foreground">
              {raceDistanceLabel} &middot; Race day{" "}
              {raceDate.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" })} &middot; {totalWeeks}{" "}
              weeks
            </span>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <Link href={`/races/${planId}`} className="text-xs font-medium text-muted-foreground underline hover:text-foreground">
            Open
          </Link>
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className="text-xs font-medium text-muted-foreground underline hover:text-foreground disabled:opacity-50"
          >
            {archiving ? "Archiving…" : "Archive"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4">
          <PlanViewSwitcher weeks={weeks} />
        </div>
      )}
    </div>
  );
}
