"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SECTOR_INFO } from "@/lib/sectors";

type SearchResult = { symbol: string; name: string };
type AssignableMember = { name: string; role: string };

export default function AddWatchlistForm({
  canAssign,
  isPortfolioManager,
  restrictedSector,
  assignableTeam,
  defaultAssignee,
}: {
  canAssign: boolean;
  isPortfolioManager: boolean;
  restrictedSector?: string;
  assignableTeam: AssignableMember[];
  defaultAssignee: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [sector, setSector] = useState(restrictedSector ?? SECTOR_INFO[0].label);
  const [assignedTo, setAssignedTo] = useState<string[]>([defaultAssignee]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelfOnly = assignedTo.length === 1 && assignedTo[0] === defaultAssignee;
  const sectorLocked = !isPortfolioManager && !!restrictedSector && !isSelfOnly;
  const effectiveSector = sectorLocked ? restrictedSector! : sector;

  function toggleAssignee(name: string) {
    setAssignedTo((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  async function handleSearch(value: string) {
    setQuery(value);
    setSelected(null);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/analyst/search?q=${encodeURIComponent(value)}`);
      const json = await res.json();
      setResults(json.results ?? []);
    } catch {
      setResults([]);
    }
  }

  function pickResult(r: SearchResult) {
    setSelected(r);
    setQuery(`${r.symbol} — ${r.name}`);
    setResults([]);
  }

  function reset() {
    setQuery("");
    setSelected(null);
    setResults([]);
    setSector(restrictedSector ?? SECTOR_INFO[0].label);
    setAssignedTo([defaultAssignee]);
    setError(null);
    setOpen(false);
  }

  async function handleSubmit() {
    if (!selected || assignedTo.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: selected.symbol,
          companyName: selected.name,
          sector: effectiveSector,
          assignedTo,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not add to watchlist.");
        return;
      }
      reset();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
      >
        + Add to Watchlist
      </button>
    );
  }

  return (
    <div className="relative rounded-lg border border-border bg-surface p-4">
      <button
        onClick={reset}
        aria-label="Cancel"
        className="absolute right-3 top-3 text-muted hover:text-foreground"
      >
        ✕
      </button>

      <div className="grid gap-3 pr-6 sm:grid-cols-2">
        <div className="relative sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted">
            Equity
          </label>
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search ticker or company"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          {results.length > 0 && !selected && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
              {results.map((r) => (
                <li key={r.symbol}>
                  <button
                    onClick={() => pickResult(r)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background"
                  >
                    <span className="font-medium text-foreground">{r.symbol}</span>
                    <span className="truncate pl-2 text-muted">{r.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted">
            Sector
          </label>
          {sectorLocked ? (
            <p className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted">
              {restrictedSector}
            </p>
          ) : (
            <select
              value={effectiveSector}
              onChange={(e) => setSector(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
            >
              {SECTOR_INFO.map((s) => (
                <option key={s.slug} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {canAssign && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted">
              Assign to
            </label>
            <div className="mt-1 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border bg-background p-2">
              {assignableTeam.map((m) => {
                const active = assignedTo.includes(m.name);
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => toggleAssignee(m.name)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-negative">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!selected || assignedTo.length === 0 || submitting}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
