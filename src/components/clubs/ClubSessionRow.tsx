"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ClubSessionData {
  id: string;
  dayOfWeek: number;
  startTime: string | null;
  type: string;
  distanceMiles: number | null;
  isConfirmed: boolean;
  rawText: string | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SESSION_TYPES = ["EASY", "TEMPO", "INTERVAL", "LONG_RUN", "SOCIAL", "TRACK", "UNKNOWN"];

export function ClubSessionRow({ clubId, session }: { clubId: string; session: ClubSessionData }) {
  const router = useRouter();
  const [dayOfWeek, setDayOfWeek] = useState(session.dayOfWeek);
  const [startTime, setStartTime] = useState(session.startTime ?? "");
  const [type, setType] = useState(session.type);
  const [distanceMiles, setDistanceMiles] = useState(session.distanceMiles?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function save(extra?: Partial<{ isConfirmed: boolean }>) {
    setSaving(true);
    await fetch(`/api/clubs/${clubId}/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek,
        startTime: startTime || undefined,
        type,
        distanceMiles: distanceMiles ? Number(distanceMiles) : undefined,
        ...extra,
      }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm dark:border-zinc-800">
      <select
        value={dayOfWeek}
        onChange={(e) => setDayOfWeek(Number(e.target.value))}
        className="rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        {DAY_LABELS.map((label, i) => (
          <option key={i} value={i}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="HH:mm"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        className="w-16 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        {SESSION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace("_", " ")}
          </option>
        ))}
      </select>
      <input
        type="number"
        placeholder="mi"
        value={distanceMiles}
        onChange={(e) => setDistanceMiles(e.target.value)}
        className="w-16 rounded border border-zinc-300 px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        onClick={() => save()}
        disabled={saving}
        className="rounded-full border border-zinc-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-zinc-700"
      >
        Save
      </button>
      {session.isConfirmed ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Confirmed
        </span>
      ) : (
        <button
          onClick={() => save({ isConfirmed: true })}
          disabled={saving}
          className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 disabled:opacity-50 dark:bg-sky-950 dark:text-sky-300"
        >
          Confirm
        </button>
      )}
    </div>
  );
}
