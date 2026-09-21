"use client";

import { useState } from "react";
import { RATINGS, type Rating } from "@/lib/ratings";

export default function RatingModal({
  title,
  initialRating,
  initialTargetPrice,
  initialTriggerPrice,
  note,
  onSave,
  onClose,
}: {
  title: string;
  initialRating: Rating | null;
  initialTargetPrice: number | null;
  initialTriggerPrice: number | null;
  note?: string;
  onSave: (data: {
    rating: Rating | null;
    targetPrice: number | null;
    triggerPrice: number | null;
  }) => Promise<string | null>;
  onClose: () => void;
}) {
  const [rating, setRating] = useState<Rating | "">(initialRating ?? "");
  const [targetPrice, setTargetPrice] = useState(initialTargetPrice?.toString() ?? "");
  const [triggerPrice, setTriggerPrice] = useState(initialTriggerPrice?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const err = await onSave({
      rating: rating || null,
      targetPrice: targetPrice.trim() ? Number(targetPrice) : null,
      triggerPrice: triggerPrice.trim() ? Number(triggerPrice) : null,
    });
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>

        <label className="mt-3 block text-xs font-medium uppercase tracking-wide text-muted">
          Rating
        </label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value as Rating)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
        >
          <option value="">No rating</option>
          {RATINGS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted">
              12M Target Price
            </label>
            <input
              type="number"
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="e.g. 150.00"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted">
              Trigger Sell Price
            </label>
            <input
              type="number"
              step="0.01"
              value={triggerPrice}
              onChange={(e) => setTriggerPrice(e.target.value)}
              placeholder="e.g. 120.00"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
            />
          </div>
        </div>

        {note && (
          <p className="mt-3 rounded-md border border-brand/40 bg-brand/5 px-3 py-2 text-xs text-brand">
            {note}
          </p>
        )}

        {error && <p className="mt-2 text-xs text-negative">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : note ? "Submit for Approval" : "Save"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
