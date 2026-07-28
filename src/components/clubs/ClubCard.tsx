"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClubSessionRow } from "./ClubSessionRow";

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
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <a href={club.websiteUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
            {club.name}
          </a>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {club.discoverySource.replace("_", " ").toLowerCase()}
          </span>
        </div>
        <div className="flex gap-2">
          {club.status !== "TRACKED" && (
            <button
              onClick={() => setStatus("TRACKED")}
              disabled={updatingStatus}
              className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background disabled:opacity-50"
            >
              Track
            </button>
          )}
          {club.status !== "DISMISSED" && (
            <button
              onClick={() => setStatus("DISMISSED")}
              disabled={updatingStatus}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50 dark:border-zinc-700"
            >
              Dismiss
            </button>
          )}
          {club.status === "DISMISSED" && (
            <button
              onClick={() => setStatus("CANDIDATE")}
              disabled={updatingStatus}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50 dark:border-zinc-700"
            >
              Reconsider
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {club.sessions.length === 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No schedule found yet — add one below.</p>
        )}
        {club.sessions.map((session) => (
          <ClubSessionRow key={session.id} clubId={club.id} session={session} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={newDay}
          onChange={(e) => setNewDay(Number(e.target.value))}
          className="rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={addSession}
          disabled={addingSession}
          className="w-fit text-xs text-zinc-500 underline dark:text-zinc-400"
        >
          + Add a session
        </button>
      </div>
    </div>
  );
}
