"use client";

import { useEffect, useState } from "react";
import type { RangeKey } from "@/lib/performance";
import { formatPercent } from "@/lib/format";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "1d", label: "1 Day" },
  { key: "5d", label: "5 Day" },
  { key: "1mo", label: "1 Month" },
  { key: "3mo", label: "3 Months" },
  { key: "6mo", label: "6 Months" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1 Year" },
];

// Merged down from the 11 GICS sectors to the same 6 buckets the fund's own
// sector pages use (Communication Services folds into TMT, Consumer Staples
// into Consumer, etc.) — Real Estate/Materials/Utilities are small enough,
// and enough of an outlier from those 6, to leave out rather than force in.
// `weight` is each bucket's approximate share of the S&P 500 by market cap,
// used only to size its treemap block, not for anything precise.
const SECTORS: { label: string; weight: number; tickers: string[] }[] = [
  { label: "Technology & Communications", weight: 41, tickers: ["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AVGO"] },
  { label: "Consumer", weight: 17, tickers: ["AMZN", "TSLA", "HD", "WMT", "PG", "KO"] },
  { label: "Financials", weight: 13, tickers: ["JPM", "BAC", "WFC", "GS", "MA"] },
  { label: "Healthcare", weight: 10, tickers: ["UNH", "JNJ", "LLY", "PFE", "ABBV"] },
  { label: "Industrials", weight: 8, tickers: ["CAT", "HON", "UPS", "BA", "GE"] },
  { label: "Energy", weight: 3, tickers: ["XOM", "CVX", "COP", "SLB", "EOG"] },
];

const ALL_TICKERS = Array.from(new Set(SECTORS.flatMap((s) => s.tickers)));

type Rect = { x: number; y: number; width: number; height: number };

/** Simple alternating slice-and-dice treemap — splits the item list roughly
 * in half by cumulative weight, cuts the rect along whichever side is
 * longer, and recurses. Not as tightly "squarified" as d3's treemap, but
 * plenty for laying out 6 known sectors without pulling in a library. */
function layoutTreemap<T extends { weight: number }>(items: T[], rect: Rect): (T & Rect)[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ ...items[0], ...rect }];

  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let acc = 0;
  let splitIndex = 1;
  for (let i = 0; i < items.length; i++) {
    acc += items[i].weight;
    if (acc >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  const groupA = items.slice(0, splitIndex);
  const groupB = items.slice(splitIndex);
  const weightA = groupA.reduce((sum, i) => sum + i.weight, 0);
  const fractionA = weightA / total;

  if (rect.width >= rect.height) {
    const widthA = rect.width * fractionA;
    return [
      ...layoutTreemap(groupA, { x: rect.x, y: rect.y, width: widthA, height: rect.height }),
      ...layoutTreemap(groupB, {
        x: rect.x + widthA,
        y: rect.y,
        width: rect.width - widthA,
        height: rect.height,
      }),
    ];
  }
  const heightA = rect.height * fractionA;
  return [
    ...layoutTreemap(groupA, { x: rect.x, y: rect.y, width: rect.width, height: heightA }),
    ...layoutTreemap(groupB, {
      x: rect.x,
      y: rect.y + heightA,
      width: rect.width,
      height: rect.height - heightA,
    }),
  ];
}

const TREEMAP_BLOCKS = layoutTreemap(SECTORS, { x: 0, y: 0, width: 100, height: 100 });

// Gap rendered between adjacent sector tiles — 10% wider than the initial 4px.
const GAP_PX = 4.4;

const SECTOR_WEIGHTS = SECTORS.map((s) => s.weight);
const MIN_WEIGHT = Math.min(...SECTOR_WEIGHTS);
const MAX_WEIGHT = Math.max(...SECTOR_WEIGHTS);

// Scales by sqrt(weight) rather than weight directly, since a tile's on-screen
// area (not its linear size) is what's proportional to weight — font size is
// a linear measure, so sqrt gets us the right visual scaling. Clamped to a
// [min,max] px range on both ends so labels stay legible in Energy's sliver
// and never balloon past what Technology & Communications' box can hold.
function scaledFontSize(weight: number, minPx: number, maxPx: number): number {
  if (MAX_WEIGHT === MIN_WEIGHT) return (minPx + maxPx) / 2;
  const t = (Math.sqrt(weight) - Math.sqrt(MIN_WEIGHT)) / (Math.sqrt(MAX_WEIGHT) - Math.sqrt(MIN_WEIGHT));
  return minPx + t * (maxPx - minPx);
}

function heatColor(value: number | null): string {
  if (value === null) return "var(--border)";
  const clamped = Math.max(-3, Math.min(3, value * 100));
  const intensity = Math.round((Math.abs(clamped) / 3) * 100);
  const base = clamped >= 0 ? "var(--positive)" : "var(--negative)";
  return `color-mix(in srgb, ${base} ${intensity}%, var(--surface))`;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

const TOOLTIP_WIDTH = 224;
const TOOLTIP_OFFSET = 18;

export default function SectorHeatmap({ className }: { className?: string }) {
  const [range, setRange] = useState<RangeKey>("1d");
  const [returns, setReturns] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<{ label: string; x: number; y: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all(
      ALL_TICKERS.map((ticker) =>
        fetch(`/api/equity/performance?ticker=${encodeURIComponent(ticker)}&range=${range}`)
          .then((res) => res.json())
          .then((json: { points?: { value: number }[] }) => [
            ticker,
            json.points && json.points.length > 0 ? json.points[json.points.length - 1].value : null,
          ] as const)
          .catch(() => [ticker, null] as const)
      )
    ).then((entries) => {
      if (cancelled) return;
      setReturns(Object.fromEntries(entries));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const blocksWithReturns = TREEMAP_BLOCKS.map((block) => {
    const tickerReturns = block.tickers
      .map((ticker) => ({ ticker, value: returns[ticker] ?? null }))
      .sort((a, b) => (b.value ?? -Infinity) - (a.value ?? -Infinity));
    const sectorReturn = average(
      tickerReturns.map((t) => t.value).filter((v): v is number => v !== null)
    );
    return { ...block, tickerReturns, sectorReturn };
  });

  const hoveredBlock = hovered
    ? blocksWithReturns.find((b) => b.label === hovered.label)
    : undefined;

  const tooltipLeft = hovered
    ? Math.min(hovered.x + TOOLTIP_OFFSET, window.innerWidth - TOOLTIP_WIDTH - 8)
    : 0;
  const tooltipTop = hovered ? hovered.y + TOOLTIP_OFFSET : 0;

  return (
    <div className={`self-start rounded-lg border border-border bg-surface p-5 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Sector Heat Map</h2>
        <div className="flex flex-wrap gap-1">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                range === r.key
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 aspect-[2/1] w-full">
        {blocksWithReturns.map((block) => {
          const labelFontSize = scaledFontSize(block.weight, 10, 20);
          const percentFontSize = scaledFontSize(block.weight, 9, 14);

          return (
            <div
              key={block.label}
              className="absolute"
              style={{
                left: `${block.x}%`,
                top: `${block.y}%`,
                width: `${block.width}%`,
                height: `${block.height}%`,
              }}
              onMouseMove={(e) => setHovered({ label: block.label, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHovered((h) => (h?.label === block.label ? null : h))}
            >
              <div
                className="absolute overflow-hidden rounded-md border border-border"
                style={{ inset: GAP_PX / 2 }}
              >
                <div
                  className={`flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden p-2 text-center transition-[filter] ${
                    hovered?.label === block.label ? "brightness-110" : ""
                  }`}
                  style={{ backgroundColor: loading ? "var(--border)" : heatColor(block.sectorReturn) }}
                >
                  <span
                    className="truncate font-semibold text-foreground"
                    style={{ fontSize: `${labelFontSize}px` }}
                  >
                    {block.label}
                  </span>
                  <span
                    className="font-medium text-foreground/80"
                    style={{ fontSize: `${percentFontSize}px` }}
                  >
                    {!loading && block.sectorReturn !== null ? formatPercent(block.sectorReturn, 1) : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hoveredBlock && (
        <div
          className="pointer-events-none fixed z-20 rounded-lg border border-border bg-surface p-3 shadow-lg"
          style={{ left: tooltipLeft, top: tooltipTop, width: TOOLTIP_WIDTH }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{hoveredBlock.label}</p>
            <p
              className={`text-sm font-semibold ${
                hoveredBlock.sectorReturn === null
                  ? "text-muted"
                  : hoveredBlock.sectorReturn >= 0
                    ? "text-positive"
                    : "text-negative"
              }`}
            >
              {!loading && hoveredBlock.sectorReturn !== null
                ? formatPercent(hoveredBlock.sectorReturn, 1)
                : "—"}
            </p>
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            ~{hoveredBlock.weight}% of the equities market
          </p>
          <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
            {hoveredBlock.tickerReturns.map(({ ticker, value }) => (
              <div key={ticker} className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{ticker}</span>
                <span
                  className={
                    value === null ? "text-muted" : value >= 0 ? "text-positive" : "text-negative"
                  }
                >
                  {!loading && value !== null ? formatPercent(value, 1) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
