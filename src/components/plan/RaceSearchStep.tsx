"use client";

import { useState } from "react";

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
      <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Race</span>
        <span>{confirmedSummary}</span>
        <button
          type="button"
          onClick={() => {
            setConfirmedSummary(null);
            setSelected(null);
            setResults(null);
            setShowConfirmForm(false);
          }}
          className="w-fit text-xs text-zinc-500 underline dark:text-zinc-400"
        >
          Change
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
      >
        Look up a race by name
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Race name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="text"
            placeholder="City (optional)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-32 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            type="text"
            placeholder="State (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="w-fit rounded-full border border-zinc-300 px-4 py-1.5 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {results && !showConfirmForm && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No results found. You can enter the details manually.
            </p>
          )}
          {results.map((candidate, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectCandidate(candidate)}
              className="flex flex-col items-start gap-0.5 rounded-md border border-zinc-200 p-2 text-left text-sm dark:border-zinc-800"
            >
              <span className="font-medium">{candidate.name}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {candidate.raceDate ? new Date(candidate.raceDate).toLocaleDateString() : "date unknown"}
                {candidate.city ? ` · ${candidate.city}, ${candidate.state ?? ""}` : ""}
                {candidate.distanceMeters
                  ? ` · ${(candidate.distanceMeters * METERS_TO_MILES).toFixed(1)} mi`
                  : ""}
                {` · ${candidate.source}`}
              </span>
            </button>
          ))}
          <button type="button" onClick={selectManual} className="w-fit text-sm text-zinc-500 underline dark:text-zinc-400">
            None of these — enter manually
          </button>
        </div>
      )}

      {showConfirmForm && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <p className="text-sm font-medium">Confirm race details</p>
          <input
            type="text"
            placeholder="Race name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={form.raceDate}
              onChange={(e) => setForm({ ...form, raceDate: e.target.value })}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="text"
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="text"
              placeholder="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-20 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={form.terrainType}
              onChange={(e) => setForm({ ...form, terrainType: e.target.value })}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="UNKNOWN">Terrain unknown</option>
              <option value="ROAD">Road</option>
              <option value="TRAIL">Trail</option>
              <option value="MIXED">Mixed</option>
            </select>
            <input
              type="number"
              placeholder="Elevation gain (ft)"
              value={form.elevationGainFeet}
              onChange={(e) => setForm({ ...form, elevationGainFeet: e.target.value })}
              className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !form.name}
            className="w-fit rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Confirm race"}
          </button>
        </div>
      )}
    </div>
  );
}
