"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AssigneeList from "@/components/team/AssigneeList";
import { formatPrice, formatPercent } from "@/lib/format";
import type { SectorInfo } from "@/lib/sectors";
import RatingModal from "@/components/ratings/RatingModal";
import ActionsMenu from "@/components/ratings/ActionsMenu";
import { ratingTone, type Rating } from "@/lib/ratings";

type AssignableMember = { name: string; role: string };

export type CoverageHolding = {
  ticker: string;
  companyName: string | null;
  sector: string;
  currentPrice: number | null;
  percentChange: number | null;
  assignedTo: string[];
  rating: Rating | null;
  targetPrice: number | null;
  triggerPrice: number | null;
};

function hasRating(item: CoverageHolding): boolean {
  return item.rating !== null || item.targetPrice !== null || item.triggerPrice !== null;
}

function RatingBadge({ item }: { item: CoverageHolding }) {
  const hasAny = item.rating !== null || item.targetPrice !== null || item.triggerPrice !== null;
  const tone = ratingTone(item.rating);
  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <p className="min-h-[1rem] text-xs text-muted">
      {hasAny ? (
        <>
          {item.rating && <span className={`font-semibold ${toneClass}`}>{item.rating}</span>}
          {item.rating && (item.targetPrice !== null || item.triggerPrice !== null) && " · "}
          {item.targetPrice !== null && <>Target {formatPrice(item.targetPrice)}</>}
          {item.targetPrice !== null && item.triggerPrice !== null && " · "}
          {item.triggerPrice !== null && <>Trigger Sell {formatPrice(item.triggerPrice)}</>}
        </>
      ) : (
        <>&nbsp;</>
      )}
    </p>
  );
}

const COVERAGE_ROW_COLUMNS = "64px minmax(0,1fr) 90px 64px 200px 40px";

function ManageModal({
  ticker,
  assignableTeam,
  initialAssignedTo,
  onClose,
  onSaved,
}: {
  ticker: string;
  assignableTeam: AssignableMember[];
  initialAssignedTo: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [assignedTo, setAssignedTo] = useState<string[]>(initialAssignedTo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(name: string) {
    setAssignedTo((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, assignedTo }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not save coverage.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-5">
        <h2 className="text-lg font-bold text-foreground">Assign Coverage — {ticker}</h2>
        <p className="mt-1 text-xs text-muted">Select who covers this holding.</p>
        <div className="mt-3 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border bg-background p-2">
          {assignableTeam.map((m) => {
            const active = assignedTo.includes(m.name);
            return (
              <button
                key={m.name}
                type="button"
                onClick={() => toggle(m.name)}
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
        {error && <p className="mt-2 text-xs text-negative">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
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

export default function CoverageItems({
  items,
  sectors,
  isPortfolioManager,
  canRate,
  mySector,
  assignableTeam,
}: {
  items: CoverageHolding[];
  sectors: SectorInfo[];
  isPortfolioManager: boolean;
  canRate: boolean;
  mySector?: string;
  assignableTeam: AssignableMember[];
}) {
  const router = useRouter();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("list");
  const [managing, setManaging] = useState<CoverageHolding | null>(null);
  const [ratingItem, setRatingItem] = useState<CoverageHolding | null>(null);

  function canManage(item: CoverageHolding): boolean {
    return isPortfolioManager || item.sector === mySector;
  }

  async function saveRating(
    ticker: string,
    data: { rating: Rating | null; targetPrice: number | null; triggerPrice: number | null }
  ): Promise<string | null> {
    const res = await fetch(`/api/coverage/${ticker}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return json?.error ?? "Could not save rating.";
    }
    window.dispatchEvent(new Event("ratings-pending-changed"));
    router.refresh();
    return null;
  }

  const activeSectors = sectors.filter((s) => items.some((i) => i.sector === s.label));
  const q = query.trim().toLowerCase();
  const visibleItems = items
    .filter((i) => !selectedSector || i.sector === selectedSector)
    .filter(
      (i) =>
        !q ||
        i.ticker.toLowerCase().includes(q) ||
        (i.companyName ?? "").toLowerCase().includes(q) ||
        i.assignedTo.some((name) => name.toLowerCase().includes(q))
    );

  return (
    <div>
      {activeSectors.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSector(null)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              selectedSector === null
                ? "border-brand bg-brand text-white"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            All Holdings
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
          placeholder="Search ticker, company, or analyst"
          className="w-full flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-brand"
        />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "grid" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => {
            const up = (item.percentChange ?? 0) >= 0;
            return (
              <div
                key={item.ticker}
                className="flex h-full flex-col rounded-lg border border-border bg-surface p-4"
              >
                <Link href={`/equity/${item.ticker}`} className="block">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{item.ticker}</p>
                    <p
                      className={`text-sm font-medium ${
                        item.percentChange !== null ? (up ? "text-positive" : "text-negative") : "text-muted"
                      }`}
                    >
                      {item.percentChange !== null ? formatPercent(item.percentChange) : "—"}
                    </p>
                  </div>
                  <p className="truncate text-sm text-muted">{item.companyName ?? ""}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {item.currentPrice !== null ? formatPrice(item.currentPrice) : "—"}
                  </p>
                  <RatingBadge item={item} />
                </Link>
                <div className="mt-2 min-h-[18px]">
                  <AssigneeList names={item.assignedTo} />
                </div>
                <div className="mt-auto flex items-center gap-1.5 pt-3">
                  {canManage(item) && (
                    <button
                      onClick={() => setManaging(item)}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
                    >
                      Manage
                    </button>
                  )}
                  {canRate && (
                    <button
                      onClick={() => setRatingItem(item)}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
                    >
                      {hasRating(item) ? "Edit Holdings Rating" : "Add Holdings Rating"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {visibleItems.map((item) => {
            const up = (item.percentChange ?? 0) >= 0;
            return (
              <div
                key={item.ticker}
                className="grid items-center gap-4 rounded-lg border border-border bg-surface p-3 hover:border-brand"
                style={{ gridTemplateColumns: COVERAGE_ROW_COLUMNS }}
              >
                <Link href={`/equity/${item.ticker}`} className="font-semibold text-foreground">
                  {item.ticker}
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/equity/${item.ticker}`}
                    className="block truncate text-sm text-muted hover:text-brand"
                  >
                    {item.companyName ?? ""}
                  </Link>
                  <RatingBadge item={item} />
                </div>
                <Link
                  href={`/equity/${item.ticker}`}
                  className="text-right text-sm font-medium text-foreground"
                >
                  {item.currentPrice !== null ? formatPrice(item.currentPrice) : "—"}
                </Link>
                <Link
                  href={`/equity/${item.ticker}`}
                  className={`text-right text-sm font-medium ${
                    item.percentChange !== null ? (up ? "text-positive" : "text-negative") : "text-muted"
                  }`}
                >
                  {item.percentChange !== null ? formatPercent(item.percentChange) : "—"}
                </Link>
                <div className="min-w-0">
                  <AssigneeList names={item.assignedTo} />
                </div>
                <ActionsMenu
                  actions={[
                    ...(canManage(item) ? [{ label: "Manage", onClick: () => setManaging(item) }] : []),
                    ...(canRate
                      ? [
                          {
                            label: hasRating(item) ? "Edit Holdings Rating" : "Add Holdings Rating",
                            onClick: () => setRatingItem(item),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            );
          })}
        </div>
      )}

      {managing && (
        <ManageModal
          ticker={managing.ticker}
          assignableTeam={assignableTeam}
          initialAssignedTo={managing.assignedTo}
          onClose={() => setManaging(null)}
          onSaved={() => {
            setManaging(null);
            router.refresh();
          }}
        />
      )}

      {ratingItem && (
        <RatingModal
          title={`${hasRating(ratingItem) ? "Edit" : "Add"} Holdings Rating — ${ratingItem.ticker}`}
          initialRating={ratingItem.rating}
          initialTargetPrice={ratingItem.targetPrice}
          initialTriggerPrice={ratingItem.triggerPrice}
          note={
            canManage(ratingItem)
              ? undefined
              : "This will be submitted to your Sector Head or the Portfolio Manager for approval."
          }
          onSave={(data) => saveRating(ratingItem.ticker, data)}
          onClose={() => setRatingItem(null)}
        />
      )}
    </div>
  );
}
