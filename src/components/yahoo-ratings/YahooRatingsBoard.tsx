"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScreenedEquity, AnalystRatingDetail } from "@/lib/yahoo";
import { formatPrice, formatPercent } from "@/lib/format";

type SectorGroup = {
  code: string;
  label: string;
  equities: ScreenedEquity[];
};

function recommendationLabel(key: string | null): string {
  if (!key) return "—";
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const TREND_SEGMENTS = [
  { key: "strongBuy", label: "Strong Buy", className: "bg-positive" },
  { key: "buy", label: "Buy", className: "bg-positive/60" },
  { key: "hold", label: "Hold", className: "bg-muted/60" },
  { key: "sell", label: "Sell", className: "bg-negative/60" },
  { key: "strongSell", label: "Strong Sell", className: "bg-negative" },
] as const;

function TrendBar({ trend }: { trend: NonNullable<AnalystRatingDetail["trend"]> }) {
  const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
  if (total === 0) return null;

  return (
    <div className="w-full max-w-[160px]">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-background">
        {TREND_SEGMENTS.map((segment) => {
          const value = trend[segment.key];
          if (value === 0) return null;
          return (
            <div
              key={segment.key}
              className={segment.className}
              style={{ width: `${(value / total) * 100}%` }}
              title={`${segment.label}: ${value}`}
            />
          );
        })}
      </div>
    </div>
  );
}

const TREND_SEGMENT_COLOR: Record<(typeof TREND_SEGMENTS)[number]["key"], string> = Object.fromEntries(
  TREND_SEGMENTS.map((s) => [s.key, s.className])
) as Record<(typeof TREND_SEGMENTS)[number]["key"], string>;

function RatingSummary({ detail }: { detail: AnalystRatingDetail | null }) {
  if (!detail) {
    return <p className="mt-2 text-xs text-muted">No detailed ratings available.</p>;
  }

  return (
    <div className="mt-2 space-y-2 text-xs text-muted">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p>Recommendation:</p>
          <p className="font-medium text-foreground">{recommendationLabel(detail.recommendationKey)}</p>
        </div>
        <div>
          <p>Mean Score:</p>
          <p className="font-medium text-foreground">
            {detail.recommendationMean !== null ? detail.recommendationMean.toFixed(2) : "—"}
          </p>
        </div>
        <div>
          <p>Analyst Opinions:</p>
          <p className="font-medium text-foreground">{detail.numberOfAnalystOpinions ?? "—"}</p>
        </div>
        <div>
          <p>Price Target (Low/Mean/High):</p>
          <p className="font-medium text-foreground">
            {formatPrice(detail.targetLowPrice)} / {formatPrice(detail.targetMeanPrice)} /{" "}
            {formatPrice(detail.targetHighPrice)}
          </p>
        </div>
      </div>

      {detail.trend && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-foreground">Analyst Breakdown</p>
            <ul className="space-y-0.5">
              <li className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TREND_SEGMENT_COLOR.strongBuy}`} />
                Strong Buy: {detail.trend.strongBuy}
              </li>
              <li className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TREND_SEGMENT_COLOR.buy}`} />
                Buy: {detail.trend.buy}
              </li>
              <li className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TREND_SEGMENT_COLOR.hold}`} />
                Hold: {detail.trend.hold}
              </li>
              <li className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TREND_SEGMENT_COLOR.sell}`} />
                Sell: {detail.trend.sell}
              </li>
              <li className="flex items-center gap-1.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TREND_SEGMENT_COLOR.strongSell}`} />
                Strong Sell: {detail.trend.strongSell}
              </li>
            </ul>
          </div>
          <TrendBar trend={detail.trend} />
        </div>
      )}
    </div>
  );
}

function ActionButtons({ symbol, className }: { symbol: string; className?: string }) {
  const edgarFilingsUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(symbol)}&type=&dateb=&owner=include&count=40`;
  const buttonClass =
    "inline-block rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted hover:border-brand hover:text-foreground";

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ""}`}>
      <a href={`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`} target="_blank" rel="noreferrer" className={buttonClass}>
        Open Equity on Yahoo
      </a>
      <a href={edgarFilingsUrl} target="_blank" rel="noreferrer" className={buttonClass}>
        Open Filings
      </a>
    </div>
  );
}

function EquityCard({ equity, detail }: { equity: ScreenedEquity; detail: AnalystRatingDetail | null }) {
  const up = (equity.changePercent ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link href={`/equity/${encodeURIComponent(equity.symbol)}`} className="group/link">
          <h3 className="text-sm font-semibold text-foreground group-hover/link:text-brand">
            {equity.name} <span className="text-muted">({equity.symbol})</span>
          </h3>
          <p className="text-xs text-muted">{equity.averageAnalystRating ?? "No rating available"}</p>
        </Link>
        <Link href={`/equity/${encodeURIComponent(equity.symbol)}`} className="group/link text-right">
          <p className="text-sm font-semibold text-foreground group-hover/link:text-brand">
            {formatPrice(equity.price)}
          </p>
          {equity.changePercent !== null && (
            <p className={`text-xs font-medium ${up ? "text-positive" : "text-negative"}`}>
              {formatPercent(equity.changePercent)}
            </p>
          )}
        </Link>
      </div>

      <RatingSummary detail={detail} />

      <ActionButtons symbol={equity.symbol} className="mt-3" />
    </div>
  );
}

export default function YahooRatingsBoard({
  sectors,
  details,
}: {
  sectors: SectorGroup[];
  details: Record<string, AnalystRatingDetail | null>;
}) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const visibleSectors = selectedSector ? sectors.filter((s) => s.code === selectedSector) : sectors;

  return (
    <div>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {sectors.map((sector) => (
          <button
            key={sector.code}
            onClick={() => setSelectedSector((prev) => (prev === sector.code ? null : sector.code))}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              selectedSector === sector.code
                ? "border-brand bg-brand text-white"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {sector.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-12">
        {visibleSectors.map((sector) => (
          <div key={sector.code}>
            <h2 className="mb-4 text-xl font-semibold text-foreground">{sector.label}</h2>
            {sector.equities.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sector.equities.map((equity) => (
                  <EquityCard key={equity.symbol} equity={equity} detail={details[equity.symbol] ?? null} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Could not load ratings for this sector right now.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
