"use client";

import { useEffect, useRef, useState } from "react";
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
  raw?: { snippet?: string };
}

interface CatalogSuggestion {
  id: string;
  name: string;
  commonName: string | null;
  raceDate: string | null; // ISO
  city: string | null;
  state: string | null;
  distanceMeters: number | null;
  logoUrl: string | null;
  description: string | null;
  source: string;
  suggestedRaceDistance: string | null;
}

interface ConfirmedRace {
  raceId: string;
  raceDistance: string | null;
  raceDate: string | null; // YYYY-MM-DD
}

const METERS_TO_MILES = 1 / 1609.34;
const METERS_TO_FEET = 3.28084;
const INITIAL_OTHER_RESULTS_SHOWN = 5;
const TYPEAHEAD_DEBOUNCE_MS = 200;
const MIN_TYPEAHEAD_LENGTH = 2;
// A higher bar than the typeahead's own minimum, and a longer debounce --
// this fires a real external search (RunSignup + SerpApi), so it shouldn't
// trigger on a query that's still just a few characters into being typed.
const MIN_AUTO_WEB_SEARCH_LENGTH = 4;
const AUTO_WEB_SEARCH_DEBOUNCE_MS = 700;

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function RaceSearchStep({ onConfirmed }: { onConfirmed: (result: ConfirmedRace) => void }) {
  // Typeahead against the local Race catalog -- the primary flow now.
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [typeaheadLoading, setTypeaheadLoading] = useState(false);
  const requestIdRef = useRef(0);
  // Tracks which query string has already auto-triggered a web search, so
  // a query that settles at zero catalog matches doesn't refire the search
  // on every re-render while the user sits on that same text.
  const autoSearchedQueryRef = useRef<string | null>(null);

  // Live web-search lookup -- demoted to a secondary "can't find it" escape
  // hatch, gated behind `showLiveSearch`. Logic below is unchanged from
  // before this component grew a typeahead.
  const [showLiveSearch, setShowLiveSearch] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RaceCandidate[] | null>(null);
  const [selected, setSelected] = useState<RaceCandidate | null>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [showAllOthers, setShowAllOthers] = useState(false);

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

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_TYPEAHEAD_LENGTH) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setTypeaheadLoading(true);
      try {
        const response = await fetch(`/api/races/autocomplete?q=${encodeURIComponent(trimmed)}`);
        if (!response.ok) return;
        const { results } = await response.json();
        if (requestId !== requestIdRef.current) return; // a newer keystroke already superseded this
        setSuggestions(results);
        setSuggestionsOpen(true);
      } finally {
        if (requestId === requestIdRef.current) setTypeaheadLoading(false);
      }
    }, TYPEAHEAD_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Once the catalog typeahead has genuinely settled on zero matches for a
  // long-enough query, automatically fall through to the live web search
  // instead of waiting on the user to notice and click "Can't find it?".
  // A confirmed result still always goes through the confirm-details step
  // below before POST /api/races -- catalog rows have no per-user owner
  // (see Race's schema), so anything confirmed here is already shared
  // across every user's search, which is exactly why it still gets a human
  // check first rather than being added sight-unseen.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_AUTO_WEB_SEARCH_LENGTH) return;
    if (typeaheadLoading || suggestions.length > 0) return;
    if (showLiveSearch || autoSearchedQueryRef.current === trimmed) return;

    const timer = setTimeout(() => {
      autoSearchedQueryRef.current = trimmed;
      setShowLiveSearch(true);
      setName(trimmed);
      handleSearch(trimmed);
    }, AUTO_WEB_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, typeaheadLoading, suggestions, showLiveSearch]);

  function selectCatalogRace(race: CatalogSuggestion) {
    // Catalog rows are already-vetted (curated by hand, or synced from
    // RunSignup with a real external ID), so unlike the live-search path
    // below this skips the confirm form and POST /api/races entirely --
    // reusing the existing row is exactly what lets two plans for the same
    // real-world race share one Race.id later.
    setSuggestionsOpen(false);
    setConfirmedSummary(
      `${race.commonName ?? race.name}${race.raceDate ? ` — ${toDateInputValue(race.raceDate)}` : ""}`
    );
    onConfirmed({
      raceId: race.id,
      raceDistance: race.suggestedRaceDistance,
      raceDate: race.raceDate ? toDateInputValue(race.raceDate) : null,
    });
  }

  async function handleSearch(nameOverride?: string) {
    const searchName = nameOverride ?? name;
    if (!searchName.trim()) {
      setError("Enter a race name to search.");
      return;
    }

    setSearching(true);
    setError(null);
    setResults(null);
    setShowAllOthers(false);

    try {
      const response = await fetch("/api/races/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: searchName, city: city || undefined, state: state || undefined }),
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

  function reset() {
    setConfirmedSummary(null);
    setSelected(null);
    setResults(null);
    setShowConfirmForm(false);
    setShowLiveSearch(false);
    setQuery("");
    setSuggestions([]);
    setSuggestionsOpen(false);
  }

  const webResults = results?.filter((r) => r.source === "WEB_SEARCH") ?? [];
  const otherResults = results?.filter((r) => r.source !== "WEB_SEARCH") ?? [];

  if (confirmedSummary) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm">
        <span className="text-xs font-medium text-muted-foreground">Race</span>
        <span>{confirmedSummary}</span>
        <button type="button" onClick={reset} className="w-fit text-xs text-muted-foreground underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      {/*
        A plain div, not a <form> -- this component is used inside
        PlanSetupWizard's own outer <form>, and nested <form> elements are
        invalid HTML. Browsers "fix" that by collapsing/merging the two,
        which made clicking Search actually submit the outer wizard form
        instead of running this search.
      */}
      <div className="relative flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Find your race</label>
        <Input
          type="text"
          placeholder="Start typing a race name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
            if (e.key === "Escape") setSuggestionsOpen(false);
          }}
        />

        {suggestionsOpen && (
          <div className="absolute top-full z-10 mt-1 flex w-full flex-col overflow-hidden rounded-md border border-border bg-surface shadow-lg">
            {typeaheadLoading && suggestions.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Searching…</div>
            )}
            {!typeaheadLoading && suggestions.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">
                {showLiveSearch
                  ? "No matches in our list — searching the web below…"
                  : "No matches yet — keep typing, or it'll search the web automatically."}
              </div>
            )}
            {suggestions.map((race) => (
              <button
                key={race.id}
                type="button"
                onClick={() => selectCatalogRace(race)}
                className="flex items-center gap-2 border-b border-border p-2 text-left text-sm last:border-b-0 hover:bg-accent/10"
              >
                {race.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={race.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{race.commonName ?? race.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[
                      race.distanceMeters ? `${(race.distanceMeters * METERS_TO_MILES).toFixed(1)} mi` : null,
                      race.raceDate
                        ? new Date(race.raceDate).toLocaleDateString(undefined, { timeZone: "UTC" })
                        : "date unknown",
                      race.city ? `${race.city}, ${race.state ?? ""}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {!showLiveSearch && (
        <button
          type="button"
          onClick={() => {
            setShowLiveSearch(true);
            setName(query);
            setSuggestionsOpen(false);
          }}
          className="w-fit text-xs text-muted-foreground underline"
        >
          Can&rsquo;t find it? Search the web
        </button>
      )}

      {showLiveSearch && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div
            className="flex flex-col gap-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          >
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Race name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
            <Button type="button" onClick={() => handleSearch()} variant="secondary" disabled={searching} className="w-fit">
              {searching ? "Searching…" : "Search"}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {results && !showConfirmForm && (
            <div className="flex flex-col gap-3">
              {results.length === 0 && (
                <p className="text-sm text-muted-foreground">No results found. You can enter the details manually.</p>
              )}

              {webResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    From the web
                  </span>
                  {webResults.map((candidate, i) => (
                    <button
                      key={`web-${i}`}
                      type="button"
                      onClick={() => selectCandidate(candidate)}
                      className="flex flex-col items-start gap-1 rounded-md border border-accent/40 bg-accent/5 p-3 text-left text-sm transition-colors hover:border-accent"
                    >
                      <span className="font-medium">{candidate.name}</span>
                      {candidate.sourceUrl && (
                        <span className="text-xs text-accent">{hostname(candidate.sourceUrl)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {[
                          candidate.distanceMeters ? `${(candidate.distanceMeters * METERS_TO_MILES).toFixed(1)} mi` : null,
                          candidate.city ? `${candidate.city}, ${candidate.state ?? ""}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {candidate.raw?.snippet && (
                        <span className="text-xs text-muted-foreground italic">
                          &ldquo;{candidate.raw.snippet}&rdquo;
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Race date isn&rsquo;t guessed automatically (the snippet above may show it) — confirm it
                        below.
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {otherResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Other matches on RunSignup
                  </span>
                  {(showAllOthers ? otherResults : otherResults.slice(0, INITIAL_OTHER_RESULTS_SHOWN)).map(
                    (candidate, i) => (
                      <button
                        key={`other-${i}`}
                        type="button"
                        onClick={() => selectCandidate(candidate)}
                        className="flex flex-col items-start gap-0.5 rounded-md border border-border p-2 text-left text-sm transition-colors hover:border-accent"
                      >
                        <span className="font-medium">{candidate.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {[
                            candidate.distanceMeters ? `${(candidate.distanceMeters * METERS_TO_MILES).toFixed(1)} mi` : null,
                            candidate.raceDate
                              ? new Date(candidate.raceDate).toLocaleDateString(undefined, { timeZone: "UTC" })
                              : "date unknown",
                            candidate.city ? `${candidate.city}, ${candidate.state ?? ""}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    )
                  )}
                  {!showAllOthers && otherResults.length > INITIAL_OTHER_RESULTS_SHOWN && (
                    <button
                      type="button"
                      onClick={() => setShowAllOthers(true)}
                      className="w-fit text-xs font-medium text-accent underline"
                    >
                      Show {otherResults.length - INITIAL_OTHER_RESULTS_SHOWN} more
                    </button>
                  )}
                </div>
              )}

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
                <Input
                  type="date"
                  value={form.raceDate}
                  onChange={(e) => setForm({ ...form, raceDate: e.target.value })}
                />
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
      )}
    </div>
  );
}
