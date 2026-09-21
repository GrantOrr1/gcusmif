"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReportUpload } from "@/lib/reportUploads";

const TYPE_LABELS: Record<string, string> = {
  equity_report: "Equity Report",
  coverage_watchlist_report: "Watchlist Report",
  financial_model: "Financial Model",
};

export default function MyPendingUploads({ initialItems }: { initialItems: ReportUpload[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cancelUpload(id: number) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not cancel this upload.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      window.dispatchEvent(new Event("reports-pending-changed"));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Your Uploads Awaiting Approval
      </h2>
      {error && <p className="mt-2 text-xs text-negative">{error}</p>}
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
          >
            <div>
              <p className="font-medium text-foreground">{item.title}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span>{TYPE_LABELS[item.reportType] ?? item.reportType}</span>
                {item.ticker && (
                  <>
                    <span>·</span>
                    <Link href={`/equity/${item.ticker}`} className="hover:text-brand">
                      {item.ticker}
                    </Link>
                  </>
                )}
                <span>·</span>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                <span>·</span>
                <span>Pending review</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`/api/reports/file/${item.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface"
              >
                {item.reportType === "financial_model" ? "Download" : "View"}
              </a>
              <button
                onClick={() => cancelUpload(item.id)}
                disabled={busyId === item.id}
                className="rounded-md border border-negative px-3 py-1.5 text-sm font-medium text-negative hover:bg-negative/10 disabled:opacity-50"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
