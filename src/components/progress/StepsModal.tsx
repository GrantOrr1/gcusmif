"use client";

import { useEffect, useState } from "react";
import { formatPhoenixDateTime } from "@/lib/format";

type ProgressNote = { id: number; ticker: string; note: string; author: string; createdAt: string };

const MAX_WORDS = 100;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Shows the running log of "what step are you on" notes for a ticker, used
 * from both the Holdings (coverage) and Coverage (watchlist) pages — notes
 * are keyed by ticker only, so the log carries over regardless of which page
 * it's viewed from. Anyone signed in can read the log; only `canAdd` callers
 * (assigned analyst, that sector's Sector Head, or the Portfolio Manager,
 * decided by the caller) can post a new one. */
export default function StepsModal({
  ticker,
  canAdd,
  onClose,
}: {
  ticker: string;
  canAdd: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<ProgressNote[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/progress-notes?ticker=${encodeURIComponent(ticker)}`)
      .then((res) => res.json())
      .then((json: { notes?: ProgressNote[] }) => {
        if (!cancelled) setNotes(json.notes ?? []);
      })
      .catch(() => {
        if (!cancelled) setNotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const words = wordCount(draft);
  const overLimit = words > MAX_WORDS;

  async function handleSubmit() {
    if (!draft.trim() || overLimit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/progress-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, note: draft.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Could not save note.");
        return;
      }
      setNotes((prev) => [json.note, ...(prev ?? [])]);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Steps — {ticker}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        {canAdd && (
          <div className="mt-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="What step are you on?"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
            />
            <div className="mt-1 flex items-center justify-between">
              <p className={`text-xs ${overLimit ? "text-negative" : "text-muted"}`}>
                {words}/{MAX_WORDS} words
              </p>
              <button
                onClick={handleSubmit}
                disabled={saving || !draft.trim() || overLimit}
                className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add Step"}
              </button>
            </div>
            {error && <p className="mt-1 text-xs text-negative">{error}</p>}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
          {notes === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted">No steps logged yet.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="rounded-md border border-border bg-background p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{n.author}</p>
                  <p className="text-xs text-muted">{formatPhoenixDateTime(n.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-foreground">{n.note}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
