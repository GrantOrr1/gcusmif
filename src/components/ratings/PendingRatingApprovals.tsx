"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RatingSubmission } from "@/lib/ratingSubmissions";
import { formatPrice } from "@/lib/format";

export default function PendingRatingApprovals({
  initialItems,
  heading,
}: {
  initialItems: RatingSubmission[];
  heading: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(id: number, action: "approve" | "decline") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/ratings/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not update this rating.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      window.dispatchEvent(new Event("ratings-pending-changed"));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <div className="mb-8 rounded-lg border border-brand/40 bg-brand/5 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">{heading}</h2>
      {error && <p className="mt-2 text-xs text-negative">{error}</p>}
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface p-3"
          >
            <div className="min-w-0">
              <Link
                href={`/equity/${item.ticker}`}
                className="font-medium text-foreground hover:text-brand"
              >
                {item.ticker}
              </Link>
              <p className="mt-0.5 text-xs text-muted">
                {item.rating ?? "No rating"}
                {item.targetPrice !== null && <> · Target {formatPrice(item.targetPrice)}</>}
                {item.triggerPrice !== null && <> · Trigger Sell {formatPrice(item.triggerPrice)}</>}
                {" · "}Submitted by {item.submittedBy}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
        ))}
      </div>
    </div>
  );
}
