"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AssigneeList from "@/components/team/AssigneeList";
import { formatPrice, formatPercent } from "@/lib/format";
import type { WatchlistItem } from "@/lib/watchlistStore";
import type { SectorInfo } from "@/lib/sectors";
import type { Quote } from "@/lib/yahoo";
import RatingModal from "@/components/ratings/RatingModal";
import ActionsMenu from "@/components/ratings/ActionsMenu";
import { ratingTone, type Rating } from "@/lib/ratings";

type ItemWithQuote = WatchlistItem & { quote: Quote | null };

function PriceTargets({ item }: { item: ItemWithQuote }) {
  const hasAny = item.rating !== null || item.targetPrice !== null || item.triggerPrice !== null;
  const tone = ratingTone(item.rating);
  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <p className="mt-1 min-h-[1rem] text-xs text-muted">
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

function hasRating(item: ItemWithQuote): boolean {
  return item.rating !== null || item.targetPrice !== null || item.triggerPrice !== null;
}

function RatingButton({ item, onClick }: { item: ItemWithQuote; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted hover:border-brand hover:text-foreground"
    >
      {hasRating(item) ? "Edit Watchlist Rating" : "Add Watchlist Rating"}
    </button>
  );
}

function ItemCard({
  item,
  canRate,
  onRate,
}: {
  item: ItemWithQuote;
  canRate: boolean;
  onRate: () => void;
}) {
  const quote = item.quote;
  const up = (quote?.change ?? 0) >= 0;
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface p-4 hover:border-brand">
      <Link href={`/equity/${item.ticker}`} className="block">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground">{item.ticker}</p>
          <p
            className={`text-sm font-medium ${
              quote?.changePercent != null ? (up ? "text-positive" : "text-negative") : "text-muted"
            }`}
          >
            {quote?.changePercent != null ? formatPercent(quote.changePercent) : "—"}
          </p>
        </div>
        <p className="truncate text-sm text-muted">
          {quote?.longName ?? quote?.shortName ?? item.companyName ?? ""}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">
          {quote?.regularMarketPrice != null ? formatPrice(quote.regularMarketPrice) : "—"}
        </p>
        <PriceTargets item={item} />
      </Link>
      <div className="mt-2 min-h-[18px]">
        <AssigneeList names={item.assignedTo} />
      </div>
      <div className="mt-auto pt-3">{canRate && <RatingButton item={item} onClick={onRate} />}</div>
    </div>
  );
}

const ROW_COLUMNS = "64px minmax(0,1fr) 90px 64px 200px 40px";

function ItemRow({
  item,
  canRate,
  onRate,
}: {
  item: ItemWithQuote;
  canRate: boolean;
  onRate: () => void;
}) {
  const quote = item.quote;
  const up = (quote?.change ?? 0) >= 0;
  return (
    <div
      className="grid items-center gap-4 rounded-lg border border-border bg-surface p-3 hover:border-brand"
      style={{ gridTemplateColumns: ROW_COLUMNS }}
    >
      <Link href={`/equity/${item.ticker}`} className="font-semibold text-foreground">
        {item.ticker}
      </Link>
      <div className="min-w-0">
        <Link
          href={`/equity/${item.ticker}`}
          className="block truncate text-sm text-muted hover:text-brand"
        >
          {quote?.longName ?? quote?.shortName ?? item.companyName ?? ""}
        </Link>
        <PriceTargets item={item} />
      </div>
      <Link
        href={`/equity/${item.ticker}`}
        className="text-right text-sm font-medium text-foreground"
      >
        {quote?.regularMarketPrice != null ? formatPrice(quote.regularMarketPrice) : "—"}
      </Link>
      <Link
        href={`/equity/${item.ticker}`}
        className={`text-right text-sm font-medium ${
          quote?.changePercent != null ? (up ? "text-positive" : "text-negative") : "text-muted"
        }`}
      >
        {quote?.changePercent != null ? formatPercent(quote.changePercent) : "—"}
      </Link>
      <div className="min-w-0">
        <AssigneeList names={item.assignedTo} />
      </div>
      <ActionsMenu
        actions={
          canRate
            ? [
                {
                  label: hasRating(item) ? "Edit Watchlist Rating" : "Add Watchlist Rating",
                  onClick: onRate,
                },
              ]
            : []
        }
      />
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

export default function WatchlistItems({
  items,
  sectors,
  isPortfolioManager = false,
  isSectorHead = false,
  mySector,
  myName,
}: {
  items: ItemWithQuote[];
  sectors: SectorInfo[];
  isPortfolioManager?: boolean;
  isSectorHead?: boolean;
  mySector?: string;
  myName?: string;
}) {
  const router = useRouter();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [personQuery, setPersonQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [ratingItem, setRatingItem] = useState<ItemWithQuote | null>(null);

  function canRate(): boolean {
    return !!myName;
  }

  function autoApprove(item: ItemWithQuote): boolean {
    return isPortfolioManager || (isSectorHead && item.sector === mySector);
  }

  async function saveRating(
    id: number,
    data: { rating: Rating | null; targetPrice: number | null; triggerPrice: number | null }
  ): Promise<string | null> {
    const res = await fetch(`/api/watchlist/${id}`, {
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

  const activeSectors = sectors.filter((s) => items.some((w) => w.sector === s.label));
  const visibleItems = items
    .filter((w) => !selectedSector || w.sector === selectedSector)
    .filter((w) =>
      personQuery.trim()
        ? w.assignedTo.some((name) =>
            name.toLowerCase().includes(personQuery.trim().toLowerCase())
          )
        : true
    );

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedSector(null)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              selectedSector === null
                ? "border-brand bg-brand text-white"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            Entire Watchlist
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
        <div className="flex items-center gap-2">
          <input
            value={personQuery}
            onChange={(e) => setPersonQuery(e.target.value)}
            placeholder="Search by person"
            className="w-full max-w-[220px] rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-brand"
          />
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {view === "grid" ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              canRate={canRate()}
              onRate={() => setRatingItem(item)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {visibleItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              canRate={canRate()}
              onRate={() => setRatingItem(item)}
            />
          ))}
        </div>
      )}

      {ratingItem && (
        <RatingModal
          title={`${hasRating(ratingItem) ? "Edit" : "Add"} Watchlist Rating — ${ratingItem.ticker}`}
          initialRating={ratingItem.rating}
          initialTargetPrice={ratingItem.targetPrice}
          initialTriggerPrice={ratingItem.triggerPrice}
          note={
            autoApprove(ratingItem)
              ? undefined
              : "This will be submitted to your Sector Head or the Portfolio Manager for approval."
          }
          onSave={(data) => saveRating(ratingItem.id, data)}
          onClose={() => setRatingItem(null)}
        />
      )}
    </div>
  );
}
