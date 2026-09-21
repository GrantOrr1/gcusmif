"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/team/Avatar";
import { slugifyName } from "@/lib/team";
import type { ReportUpload } from "@/lib/reportUploads";

const TYPE_LABELS: Record<string, string> = {
  equity_report: "Equity Report",
  coverage_watchlist_report: "Coverage Watchlist Report",
  financial_model: "Financial Model",
};

export default function PendingApprovals({ initialItems }: { initialItems: ReportUpload[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [titles, setTitles] = useState<Record<number, string>>(
    Object.fromEntries(initialItems.map((i) => [i.id, i.title]))
  );
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(id: number, action: "approve" | "decline") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not update this upload.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      window.dispatchEvent(new Event("reports-pending-changed"));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function saveTitle(id: number) {
    const title = titles[id]?.trim();
    if (!title) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not rename this upload.");
        return;
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title } : i)));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-8 rounded-lg border border-brand/40 bg-brand/5 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
        New Uploads Awaiting Approval
      </h2>
      {error && <p className="mt-2 text-xs text-negative">{error}</p>}
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const titleChanged = titles[item.id] !== item.title;
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={titles[item.id] ?? item.title}
                    onChange={(e) =>
                      setTitles((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm font-medium text-foreground outline-none focus:border-brand"
                  />
                  {titleChanged && (
                    <button
                      onClick={() => saveTitle(item.id)}
                      disabled={busyId === item.id}
                      className="rounded-md border border-brand px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 disabled:opacity-50"
                    >
                      Save
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span>{TYPE_LABELS[item.reportType] ?? item.reportType}</span>
                  {item.ticker && (
                    <>
                      <span>·</span>
                      <Link href={`/equity/${item.ticker}`} className="hover:text-brand">
                        {item.ticker}
                        {item.companyName ? ` — ${item.companyName}` : ""}
                      </Link>
                    </>
                  )}
                  <span>·</span>
                  <Link
                    href={`/team/${slugifyName(item.uploadedBy)}`}
                    className="flex items-center gap-1.5 hover:text-brand"
                  >
                    <Avatar name={item.uploadedBy} size={16} />
                    <span>{item.uploadedBy}</span>
                  </Link>
                  <span>·</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/api/reports/file/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-background"
                >
                  {item.reportType === "financial_model" ? "Download" : "View"}
                </a>
                <button
                  onClick={() => review(item.id, "approve")}
                  disabled={busyId === item.id}
                  className="rounded-md bg-positive px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  onClick={() => review(item.id, "decline")}
                  disabled={busyId === item.id}
                  className="rounded-md bg-negative px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
