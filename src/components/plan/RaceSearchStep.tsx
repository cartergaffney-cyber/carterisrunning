"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface RaceCandidate {
  source: string;
  externalId?: string;
  name: string;
  raceDate: string | null; // ISO
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  distanceMeters: number | null;
  terrainType: string;
  elevationGainMeters: number | null;
  sourceUrl?: string;
  suggestedRaceDistance: string | null;
}

interface ConfirmedRace {
  raceId: string;
  raceDistance: string | null;
  raceDate: string | null; // YYYY-MM-DD
}

const METERS_TO_MILES = 1 / 1609.34;
const METERS_TO_FEET = 3.28084;

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

export function RaceSearchStep({ onConfirmed }: { onConfirmed: (result: ConfirmedRace) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RaceCandidate[] | null>(null);
  const [selected, setSelected] = useState<RaceCandidate | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [confirmedSummary, setConfirmedSummary] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    raceDate: "",
    city: "",
    state: "",
    terrainType: "UNKNOWN",
    elevationGainFeet: "",
  });

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/races/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city: city || undefined, state: state || undefined }),
      });
      if (!response.ok) {
        setError("Search failed.");
        return;
      }
      const { results } = await response.json();
      setResults(results);
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function selectCandidate(candidate: RaceCandidate) {
    setSelected(candidate);
    setForm({
      name: candidate.name,
      raceDate: toDateInputValue(candidate.raceDate),
      city: candidate.city ?? "",
      state: candidate.state ?? "",
      terrainType: candidate.terrainType,
      elevationGainFeet: candidate.elevationGainMeters
        ? String(Math.round(candidate.elevationGainMeters * METERS_TO_FEET))
        : "",
    });
    setShowConfirmForm(true);
  }

  function selectManual() {
    setSelected(null);
    setForm({ name, raceDate: "", city, state, terrainType: "UNKNOWN", elevationGainFeet: "" });
    setShowConfirmForm(true);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          source: selected?.source ?? "MANUAL",
          externalId: selected?.externalId,
          raceDate: form.raceDate || undefined,
          city: form.city || undefined,
          state: form.state || undefined,
          distanceMeters: selected?.distanceMeters ?? undefined,
          terrainType: form.terrainType,
          elevationGainMeters: form.elevationGainFeet
            ? Number(form.elevationGainFeet) / METERS_TO_FEET
            : undefined,
          sourceUrl: selected?.sourceUrl,
        }),
      });

      if (!response.ok) {
        setError("Failed to save race details.");
        return;
      }

      const { id } = await response.json();
      setConfirmedSummary(`${form.name}${form.raceDate ? ` — ${form.raceDate}` : ""}`);
      onConfirmed({
        raceId: id,
        raceDistance: selected?.suggestedRaceDistance ?? null,
        raceDate: form.raceDate || null,
      });
    } catch {
      setError("Failed to save race details.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedSummary) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Race</span>
        <span>{confirmedSummary}</span>
        <button
          type="button"
          onClick={() => {
            setConfirmedSummary(null);
            setSelected(null);
            setResults(null);
            setShowConfirmForm(false);
          }}
          className="w-fit text-xs text-muted-foreground underline"
        >
          Change
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <Button type="button" variant="secondary" onClick={() => setExpanded(true)} className="w-fit">
        Look up a race by name
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Race name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1"
          />
          <Input
            type="text"
            placeholder="City (optional)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-32"
          />
          <Input
            type="text"
            placeholder="State (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-24"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={searching} className="w-fit">
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {results && !showConfirmForm && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">No results found. You can enter the details manually.</p>
          )}
          {results.map((candidate, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectCandidate(candidate)}
              className="flex flex-col items-start gap-0.5 rounded-md border border-border p-2 text-left text-sm transition-colors hover:border-accent"
            >
              <span className="font-medium">{candidate.name}</span>
              <span className="text-xs text-muted-foreground">
                {candidate.raceDate ? new Date(candidate.raceDate).toLocaleDateString() : "date unknown"}
                {candidate.city ? ` · ${candidate.city}, ${candidate.state ?? ""}` : ""}
                {candidate.distanceMeters
                  ? ` · ${(candidate.distanceMeters * METERS_TO_MILES).toFixed(1)} mi`
                  : ""}
                {` · ${candidate.source}`}
              </span>
            </button>
          ))}
          <button type="button" onClick={selectManual} className="w-fit text-sm text-muted-foreground underline">
            None of these — enter manually
          </button>
        </div>
      )}

      {showConfirmForm && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-sm font-medium">Confirm race details</p>
          <Input
            type="text"
            placeholder="Race name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="flex gap-2">
            <Input type="date" value={form.raceDate} onChange={(e) => setForm({ ...form, raceDate: e.target.value })} />
            <Input
              type="text"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-28"
            />
            <Input
              type="text"
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-20"
            />
          </div>
          <div className="flex gap-2">
            <Select value={form.terrainType} onChange={(e) => setForm({ ...form, terrainType: e.target.value })}>
              <option value="UNKNOWN">Terrain unknown</option>
              <option value="ROAD">Road</option>
              <option value="TRAIL">Trail</option>
              <option value="MIXED">Mixed</option>
            </Select>
            <Input
              type="number"
              placeholder="Elevation gain (ft)"
              value={form.elevationGainFeet}
              onChange={(e) => setForm({ ...form, elevationGainFeet: e.target.value })}
              className="flex-1"
            />
          </div>
          <Button type="button" onClick={handleConfirm} disabled={submitting || !form.name} className="w-fit">
            {submitting ? "Saving…" : "Confirm race"}
          </Button>
        </div>
      )}
    </div>
  );
}
