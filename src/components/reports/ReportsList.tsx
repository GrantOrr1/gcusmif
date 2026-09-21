"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AssigneeList from "@/components/team/AssigneeList";
import type { SectorInfo } from "@/lib/sectors";

type ReportEntry = {
  id?: number;
  sector?: string;
  title: string;
  date: string;
  description?: string;
  ticker?: string;
  uploadedBy?: string;
  coAuthors?: string[];
  url: string;
};

function TickerLink({ ticker }: { ticker: string }) {
  return (
    <Link
      href={`/equity/${ticker}`}
      className="font-medium text-brand hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {ticker}
    </Link>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "grid" | "list";
  onChange: (v: "grid" | "list") => void;
}) {
  return (
    <div className="flex shrink-0 gap-1 rounded-md border border-border p-0.5">
      <button
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        className={`rounded px-2 py-1 text-xs font-medium ${
          view === "grid" ? "bg-brand text-white" : "text-muted hover:text-foreground"
        }`}
      >
        Grid
      </button>
      <button
        onClick={() => onChange("list")}
        aria-label="List view"
        className={`rounded px-2 py-1 text-xs font-medium ${
          view === "list" ? "bg-brand text-white" : "text-muted hover:text-foreground"
        }`}
      >
        List
      </button>
    </div>
  );
}

export default function ReportsList({
  reports,
  canDelete,
  isPortfolioManager,
  mySector,
  sectors,
}: {
  reports: ReportEntry[];
  canDelete: boolean;
  isPortfolioManager: boolean;
  mySector?: string;
  sectors: SectorInfo[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "list">("list");
  const [query, setQuery] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const seen = Number(localStorage.getItem("lastSeenReportId") ?? "0");
    const idsWithReports = reports.filter((r): r is ReportEntry & { id: number } => r.id !== undefined);
    const fresh = idsWithReports.filter((r) => r.id > seen).map((r) => r.id);
    if (fresh.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewIds(new Set(fresh));
    }
    const maxId = idsWithReports.reduce((max, r) => Math.max(max, r.id), seen);
    if (maxId > seen) {
      localStorage.setItem("lastSeenReportId", String(maxId));
      window.dispatchEvent(new Event("reports-seen-changed"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function canDeleteReport(report: ReportEntry): boolean {
    if (!canDelete || report.id === undefined) return false;
    if (isPortfolioManager) return true;
    return !!mySector && report.sector === mySector;
  }

  async function confirmDelete() {
    if (confirmId === null) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${confirmId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not delete this report.");
        return;
      }
      setDeleted((prev) => new Set(prev).add(confirmId));
      setConfirmId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const activeSectors = sectors.filter((s) => reports.some((r) => r.sector === s.label));

  const q = query.trim().toLowerCase();
  const visibleReports = reports
    .filter((r) => r.id === undefined || !deleted.has(r.id))
    .filter((r) => !selectedSector || r.sector === selectedSector)
    .filter(
      (r) =>
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.ticker ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.uploadedBy ?? "").toLowerCase().includes(q)
    );

  return (
    <div className="mt-8">
      {error && <p className="text-sm text-negative">{error}</p>}

      {activeSectors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSector(null)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              selectedSector === null
                ? "border-brand bg-brand text-white"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            All Reports
          </button>
          {activeSectors.map((s) => (
            <button
              key={s.slug}
              onClick={() => setSelectedSector(s.label)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                selectedSector === s.label
                  ? "border-brand bg-brand text-white"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports"
          className="w-full flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-brand"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {visibleReports.map((report) => (
            <div
              key={`${report.title}-${report.date}`}
              className={`flex items-center justify-between gap-4 p-4 hover:bg-background ${
                report.id !== undefined && newIds.has(report.id) ? "flash-green" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <a href={report.url} target="_blank" rel="noreferrer" className="block">
                  <p className="truncate font-medium text-foreground">{report.title}</p>
                </a>
                {(report.description || report.ticker) && (
                  <p className="text-sm text-muted">
                    {report.description}
                    {report.description && report.ticker && " · "}
                    {report.ticker && <TickerLink ticker={report.ticker} />}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {report.uploadedBy && (
                  <AssigneeList names={[report.uploadedBy, ...(report.coAuthors ?? [])]} avatarSize={18} />
                )}
                <span className="text-xs text-muted">
                  {report.uploadedBy ? "Published " : ""}
                  {new Date(report.date).toLocaleDateString()}
                </span>
                {canDeleteReport(report) && (
                  <button
                    onClick={() => setConfirmId(report.id!)}
                    className="rounded-md border border-negative px-2 py-1 text-xs font-medium text-negative hover:bg-negative/10"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleReports.map((report) => (
            <div
              key={`${report.title}-${report.date}`}
              className={`rounded-lg border border-border bg-surface p-4 hover:border-brand ${
                report.id !== undefined && newIds.has(report.id) ? "flash-green" : ""
              }`}
            >
              <a href={report.url} target="_blank" rel="noreferrer" className="block">
                <p className="font-medium text-foreground">{report.title}</p>
              </a>
              {(report.description || report.ticker) && (
                <p className="mt-1 text-sm text-muted">
                  {report.description}
                  {report.description && report.ticker && " · "}
                  {report.ticker && <TickerLink ticker={report.ticker} />}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-2">
                {report.uploadedBy ? (
                  <AssigneeList names={[report.uploadedBy, ...(report.coAuthors ?? [])]} avatarSize={18} />
                ) : (
                  <span />
                )}
                <span className="shrink-0 text-xs text-muted">
                  {report.uploadedBy ? "Published " : ""}
                  {new Date(report.date).toLocaleDateString()}
                </span>
              </div>
              {canDeleteReport(report) && (
                <button
                  onClick={() => setConfirmId(report.id!)}
                  className="mt-2 w-full rounded-md border border-negative px-2 py-1 text-xs font-medium text-negative hover:bg-negative/10"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              Are you sure you want to delete this report?
            </h2>
            <p className="mt-1 text-sm text-muted">This cannot be undone.</p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-md bg-negative px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                disabled={deleting}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
