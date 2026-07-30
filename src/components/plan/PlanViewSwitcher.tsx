"use client";

import { useState } from "react";
import { PlanListView } from "./PlanListView";
import { PlanCalendarView } from "./PlanCalendarView";

interface WorkoutData {
  id: string;
  date: Date;
  workoutType: string;
  description: string;
  completed: boolean;
  targetDistanceMiles: number | null;
  runId: string | null;
  clubSuggestionReason: string | null;
  routeStatus: string | null;
  routeFileName: string | null;
}

interface WeekData {
  weekNumber: number;
  phase: string;
  isStepBack: boolean;
  workouts: WorkoutData[];
}

export function PlanViewSwitcher({ weeks }: { weeks: WeekData[] }) {
  const [view, setView] = useState<"list" | "calendar">("list");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView("list")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            view === "list" ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          List
        </button>
        <button
          onClick={() => setView("calendar")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            view === "calendar" ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Calendar
        </button>
      </div>

      {view === "list" ? <PlanListView weeks={weeks} /> : <PlanCalendarView weeks={weeks} />}
    </div>
  );
}
