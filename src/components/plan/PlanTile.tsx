"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlanViewSwitcher } from "./PlanViewSwitcher";
import type { WeekData } from "./types";

/** Catalog details, present only once a plan is linked to a real race. */
export interface PlanTileRace {
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  description: string | null;
  terrainType: string | null;
  websiteUrl: string | null;
}

interface PlanTileProps {
  planId: string;
  title: string;
  raceDistanceLabel: string;
  raceDate: Date;
  totalWeeks: number;
  daysToRace: number;
  priority: "A" | "B" | "C";
  race: PlanTileRace | null;
  defaultExpanded: boolean;
  weeks: WeekData[];
}

const PRIORITY_OPTIONS: { value: "A" | "B" | "C"; label: string; hint: string }[] = [
  { value: "A", label: "A — Goal race", hint: "Drives the calendar. Full taper, everything else works around it." },
  { value: "B", label: "B — Secondary", hint: "Race it well: a few easier days before, a short recovery after." },
  { value: "C", label: "C — Tune-up", hint: "Train through it. Replaces a hard session, minimal disruption." },
];

const TERRAIN_LABELS: Record<string, string> = { ROAD: "Road", TRAIL: "Trail", MIXED: "Mixed" };

export function PlanTile({
  planId,
  title,
  raceDistanceLabel,
  raceDate,
  totalWeeks,
  daysToRace,
  priority,
  race,
  defaultExpanded,
  weeks,
}: PlanTileProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [archiving, setArchiving] = useState(false);
  const [currentPriority, setCurrentPriority] = useState(priority);
  const [savingPriority, setSavingPriority] = useState(false);
  const router = useRouter();

  async function handlePriorityChange(next: "A" | "B" | "C") {
    const previous = currentPriority;
    setCurrentPriority(next);
    setSavingPriority(true);
    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: next }),
      });
      if (!response.ok) {
        setCurrentPriority(previous);
        return;
      }
      // The calendar's whole shape depends on this, so pull fresh data.
      router.refresh();
    } catch {
      setCurrentPriority(previous);
    } finally {
      setSavingPriority(false);
    }
  }

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
            className={`shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▶
          </span>

          {race?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={race.logoUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-lg border border-border object-contain"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-surface-muted text-[10px] font-semibold leading-tight text-muted-foreground">
              <span className="text-xs tabular-nums">{raceDate.getUTCDate()}</span>
              <span className="uppercase">
                {raceDate.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" })}
              </span>
            </span>
          )}

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-base font-semibold">{title}</span>
            <span className="text-sm text-muted-foreground">
              {[
                raceDistanceLabel,
                race?.terrainType ? TERRAIN_LABELS[race.terrainType] : null,
                raceDate.toLocaleDateString(undefined, { dateStyle: "long", timeZone: "UTC" }),
                race?.city ? `${race.city}${race.state ? `, ${race.state}` : ""}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="text-xs text-muted-foreground">
              {totalWeeks}-week schedule &middot;{" "}
              {daysToRace >= 0 ? `${daysToRace} days to go` : `${Math.abs(daysToRace)} days ago`}
            </span>
            {race?.description && (
              <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground/80">{race.description}</span>
            )}
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Race priority</span>
            <select
              value={currentPriority}
              disabled={savingPriority}
              onChange={(e) => handlePriorityChange(e.target.value as "A" | "B" | "C")}
              title={PRIORITY_OPTIONS.find((o) => o.value === currentPriority)?.hint}
              className="rounded-full border border-border bg-surface px-2 py-1 text-xs font-medium disabled:opacity-50"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {race?.websiteUrl && (
            <a
              href={race.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-muted-foreground underline hover:text-foreground"
            >
              Race site
            </a>
          )}
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
