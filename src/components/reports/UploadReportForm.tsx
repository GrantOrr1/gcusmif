"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REPORT_TYPE_OPTIONS: { value: string; label: string; accept: string }[] = [
  { value: "equity_report", label: "Equity Report", accept: ".pdf,application/pdf" },
  {
    value: "coverage_watchlist_report",
    label: "Watchlist Report",
    accept: ".pdf,application/pdf",
  },
  {
    value: "financial_model",
    label: "Financial Model",
    accept: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
  },
];

type SearchResult = { symbol: string; name: string };
type TeamMember = { name: string; role: string };

export default function UploadReportForm({ teamMembers = [] }: { teamMembers?: TeamMember[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState(REPORT_TYPE_OPTIONS[0].value);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tickerQuery, setTickerQuery] = useState("");
  const [tickerResults, setTickerResults] = useState<SearchResult[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<SearchResult | null>(null);
  const [coAuthors, setCoAuthors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function toggleCoAuthor(name: string) {
    setCoAuthors((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  const selectedType = REPORT_TYPE_OPTIONS.find((t) => t.value === reportType)!;

  async function handleTickerSearch(value: string) {
    setTickerQuery(value);
    setSelectedTicker(null);
    if (!value.trim()) {
      setTickerResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/analyst/search?q=${encodeURIComponent(value)}`);
      const json = await res.json();
      setTickerResults(json.results ?? []);
    } catch {
      setTickerResults([]);
    }
  }

  function pickTicker(r: SearchResult) {
    setSelectedTicker(r);
    setTickerQuery(`${r.symbol} — ${r.name}`);
    setTickerResults([]);
  }

  async function handleSubmit() {
    if (!file || !selectedTicker) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("reportType", reportType);
      formData.set("title", title);
      formData.set("ticker", selectedTicker.symbol);
      formData.set("companyName", selectedTicker.name);
      formData.set("coAuthors", JSON.stringify(coAuthors));
      formData.set("file", file);

      const res = await fetch("/api/reports/upload", { method: "POST", body: formData });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Could not upload file.");
        return;
      }

      setNotice(
        json.status === "approved"
          ? `Uploaded and published for ${selectedTicker.symbol}.`
          : `Uploaded for ${selectedTicker.symbol} — awaiting Sector Head/Portfolio Manager approval.`
      );
      setTitle("");
      setFile(null);
      setTickerQuery("");
      setSelectedTicker(null);
      setCoAuthors([]);
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => {
            setOpen(true);
            setNotice(null);
          }}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          + Upload Report
        </button>
        {notice && <p className="text-xs text-muted">{notice}</p>}
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm rounded-lg border border-border bg-surface p-4">
      <button
        onClick={() => setOpen(false)}
        aria-label="Cancel"
        className="absolute right-3 top-3 text-muted hover:text-foreground"
      >
        ✕
      </button>
      <div className="grid gap-3 pr-6">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value);
              setFile(null);
            }}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          >
            {REPORT_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="text-xs font-medium uppercase tracking-wide text-muted">
            Company / Ticker
          </label>
          <input
            value={tickerQuery}
            onChange={(e) => handleTickerSearch(e.target.value)}
            placeholder="Search ticker or company"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          {tickerResults.length > 0 && !selectedTicker && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
              {tickerResults.map((r) => (
                <li key={r.symbol}>
                  <button
                    onClick={() => pickTicker(r)}
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
            Title (optional)
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="i.e. DCF, Equity Report, SOTP, NAV"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        {teamMembers.length > 0 && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted">
              Co-Authors (optional)
            </label>
            <div className="mt-1 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border bg-background p-2">
              {teamMembers.map((m) => {
                const active = coAuthors.includes(m.name);
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => toggleCoAuthor(m.name)}
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

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted">
            File ({selectedType.value === "financial_model" ? "Excel only" : "PDF only"})
          </label>
          <input
            key={reportType}
            type="file"
            accept={selectedType.accept}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm text-foreground"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-negative">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!file || !selectedTicker || submitting}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? "Uploading…" : "Upload"}
        </button>
      </div>
    </div>
  );
}
