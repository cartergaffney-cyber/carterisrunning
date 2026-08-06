"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClubSessionRow } from "./ClubSessionRow";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

interface ClubSessionData {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  type: string;
  distanceMiles: number | null;
  isConfirmed: boolean;
  rawText: string | null;
}

interface ClubData {
  id: string;
  name: string;
  websiteUrl: string;
  discoverySource: string;
  status: string;
  sessions: ClubSessionData[];
  stravaClubId: bigint | null;
  lastEventsSyncedAt: Date | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ClubCard({ club }: { club: ClubData }) {
  const router = useRouter();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const [newDay, setNewDay] = useState(6);

  async function setStatus(status: string) {
    setUpdatingStatus(true);
    await fetch(`/api/clubs/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingStatus(false);
    router.refresh();
  }

  async function addSession() {
    setAddingSession(true);
    await fetch(`/api/clubs/${club.id}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: newDay, type: "UNKNOWN" }),
    });
    setAddingSession(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <a href={club.websiteUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
            {club.name}
          </a>
          <span className="text-xs text-muted-foreground">
            {club.discoverySource.replace("_", " ").toLowerCase()}
          </span>
        </div>
        <div className="flex gap-2">
          {club.status !== "TRACKED" && (
            <Button onClick={() => setStatus("TRACKED")} disabled={updatingStatus} className="px-3 py-1 text-xs">
              Track
            </Button>
          )}
          {club.status !== "DISMISSED" && (
            <Button
              variant="secondary"
              onClick={() => setStatus("DISMISSED")}
              disabled={updatingStatus}
              className="px-3 py-1 text-xs"
            >
              Dismiss
            </Button>
          )}
          {club.status === "DISMISSED" && (
            <Button
              variant="secondary"
              onClick={() => setStatus("CANDIDATE")}
              disabled={updatingStatus}
              className="px-3 py-1 text-xs"
            >
              Reconsider
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {club.sessions.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {club.stravaClubId && !club.lastEventsSyncedAt
              ? "Strava events not checked yet — hit “Refresh club events” above."
              : club.stravaClubId
                ? "No recurring events posted on Strava — add a session below."
                : "No schedule found yet — add one below."}
          </p>
        )}
        {club.sessions.map((session) => (
          <ClubSessionRow key={session.id} clubId={club.id} session={session} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={newDay}
          onChange={(e) => setNewDay(Number(e.target.value))}
          className="px-1.5 py-1 text-xs"
        >
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </Select>
        <button onClick={addSession} disabled={addingSession} className="w-fit text-xs text-muted-foreground underline">
          + Add a session
        </button>
      </div>
    </div>
  );
}
