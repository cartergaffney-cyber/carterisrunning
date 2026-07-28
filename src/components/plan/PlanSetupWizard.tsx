"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RaceSearchStep } from "./RaceSearchStep";
import { formatPaceSecondsPerMile } from "@/lib/utils/pace";

interface FitnessSnapshotPreview {
  windowWeeks: number;
  avgWeeklyMileageMiles: number;
  mileageTrend: "INCREASING" | "STABLE" | "DECREASING";
  bestRecentEffortDistanceMiles: number | null;
  riegelEstimatedPaceSecondsPerMile: number | null;
}

const TREND_LABELS: Record<string, string> = {
  INCREASING: "trending up",
  STABLE: "steady",
  DECREASING: "trending down",
};

const RACE_DISTANCE_OPTIONS: { value: string; label: string }[] = [
  { value: "FIVE_K", label: "5K" },
  { value: "TEN_K", label: "10K" },
  { value: "HALF_MARATHON", label: "Half Marathon" },
  { value: "MARATHON", label: "Marathon" },
  { value: "FIFTY_K", label: "50K" },
  { value: "FIFTY_MILE", label: "50 Mile" },
  { value: "HUNDRED_K", label: "100K" },
  { value: "HUNDRED_MILE", label: "100 Mile" },
];

export function PlanSetupWizard() {
  const router = useRouter();
  const [raceId, setRaceId] = useState<string | null>(null);
  const [raceDistance, setRaceDistance] = useState("MARATHON");
  const [raceDate, setRaceDate] = useState("");
  const [currentWeeklyMileageMiles, setCurrentWeeklyMileageMiles] = useState("20");
  const [goalHours, setGoalHours] = useState("");
  const [goalMinutes, setGoalMinutes] = useState("");
  const [goalSeconds, setGoalSeconds] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fitnessSnapshot, setFitnessSnapshot] = useState<FitnessSnapshotPreview | null>(null);
  const mileageEditedByUser = useRef(false);

  useEffect(() => {
    fetch("/api/fitness-assessment")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.snapshot) return;
        setFitnessSnapshot(data.snapshot);
        if (!mileageEditedByUser.current && data.snapshot.avgWeeklyMileageMiles > 0) {
          setCurrentWeeklyMileageMiles(data.snapshot.avgWeeklyMileageMiles.toFixed(1));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const goalTimeSeconds =
      goalHours || goalMinutes || goalSeconds
        ? (Number(goalHours) || 0) * 3600 + (Number(goalMinutes) || 0) * 60 + (Number(goalSeconds) || 0)
        : undefined;

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceId: raceId ?? undefined,
          raceDistance,
          raceDate,
          currentWeeklyMileageMiles: Number(currentWeeklyMileageMiles),
          goalTimeSeconds,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Failed to create plan.");
        setSubmitting(false);
        return;
      }

      const { id } = await response.json();
      router.push(`/plan/${id}`);
    } catch {
      setError("Failed to create plan.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Find your race (optional)</span>
        <RaceSearchStep
          onConfirmed={({ raceId, raceDistance, raceDate }) => {
            setRaceId(raceId);
            if (raceDistance) setRaceDistance(raceDistance);
            if (raceDate) setRaceDate(raceDate);
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="raceDistance" className="text-sm font-medium">
          Race distance
        </label>
        <select
          id="raceDistance"
          value={raceDistance}
          onChange={(e) => setRaceDistance(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {RACE_DISTANCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="raceDate" className="text-sm font-medium">
          Race date
        </label>
        <input
          id="raceDate"
          type="date"
          required
          value={raceDate}
          onChange={(e) => setRaceDate(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="currentWeeklyMileageMiles" className="text-sm font-medium">
          Current weekly mileage (miles)
        </label>
        <input
          id="currentWeeklyMileageMiles"
          type="number"
          min={1}
          max={300}
          step={0.5}
          required
          value={currentWeeklyMileageMiles}
          onChange={(e) => {
            mileageEditedByUser.current = true;
            setCurrentWeeklyMileageMiles(e.target.value);
          }}
          className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {fitnessSnapshot && fitnessSnapshot.avgWeeklyMileageMiles > 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            From your last {fitnessSnapshot.windowWeeks} weeks on Strava: avg{" "}
            {fitnessSnapshot.avgWeeklyMileageMiles.toFixed(1)} mi/week (
            {TREND_LABELS[fitnessSnapshot.mileageTrend]})
            {fitnessSnapshot.bestRecentEffortDistanceMiles && fitnessSnapshot.riegelEstimatedPaceSecondsPerMile
              ? `, best recent effort ~${formatPaceSecondsPerMile(
                  fitnessSnapshot.riegelEstimatedPaceSecondsPerMile
                )} 10K pace`
              : ""}
            . Pre-filled above — edit if it doesn&rsquo;t look right.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Goal finish time (optional)</span>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            placeholder="hh"
            value={goalHours}
            onChange={(e) => setGoalHours(e.target.value)}
            className="w-16 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="number"
            min={0}
            max={59}
            placeholder="mm"
            value={goalMinutes}
            onChange={(e) => setGoalMinutes(e.target.value)}
            className="w-16 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="number"
            min={0}
            max={59}
            placeholder="ss"
            value={goalSeconds}
            onChange={(e) => setGoalSeconds(e.target.value)}
            className="w-16 rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-foreground px-5 py-3 text-base font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {submitting ? "Generating plan..." : "Generate plan"}
      </button>
    </form>
  );
}
