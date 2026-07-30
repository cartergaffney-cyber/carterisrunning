"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2 text-sm">
      <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="px-1.5 py-1 text-xs">
        {DAY_LABELS.map((label, i) => (
          <option key={i} value={i}>
            {label}
          </option>
        ))}
      </Select>
      <Input
        type="text"
        placeholder="HH:mm"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        className="w-16 px-1.5 py-1 text-xs"
      />
      <Select value={type} onChange={(e) => setType(e.target.value)} className="px-1.5 py-1 text-xs">
        {SESSION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace("_", " ")}
          </option>
        ))}
      </Select>
      <Input
        type="number"
        placeholder="mi"
        value={distanceMiles}
        onChange={(e) => setDistanceMiles(e.target.value)}
        className="w-16 px-1.5 py-1 text-xs"
      />
      <Button variant="secondary" onClick={() => save()} disabled={saving} className="px-2 py-1 text-xs">
        Save
      </Button>
      {session.isConfirmed ? (
        <Badge tone="success">Confirmed</Badge>
      ) : (
        <Button variant="secondary" onClick={() => save({ isConfirmed: true })} disabled={saving} className="px-2 py-1 text-xs">
          Confirm
        </Button>
      )}
    </div>
  );
}
