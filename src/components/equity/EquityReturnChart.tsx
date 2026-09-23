"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RangeKey, TickerPerformanceSeries } from "@/lib/performance";
import { formatNumber, formatPercent, formatPointDateTime, formatShortDate } from "@/lib/format";
import { evenIndices } from "@/lib/chartTicks";

const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "5d", label: "5 Days" },
  { key: "1mo", label: "1 Month" },
  { key: "3mo", label: "3 Months" },
  { key: "6mo", label: "6 Months" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1 Year" },
  { key: "3y", label: "3 Years" },
];

const WIDTH = 800;
const HEIGHT = 320;

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 3H3v6M15 3h6v6M21 15v6h-6M3 15v6h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Animates `el`'s transform from wherever it currently visually sits (per
 * `from`) to its own natural layout position/size, then removes the
 * transform so the transition plays — a "FLIP" grow/shrink. */
function flip(el: HTMLElement, from: DOMRect, durationMs: number, easing: string, onDone?: () => void) {
  const to = el.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const sx = from.width / to.width;
  const sy = from.height / to.height;

  el.style.transition = "none";
  el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  // Force layout so the "from" transform paints before switching to the
  // transition, otherwise the browser can coalesce both style writes into
  // one frame and skip the animation entirely.
  void el.getBoundingClientRect();

  requestAnimationFrame(() => {
    el.style.transition = `transform ${durationMs}ms ${easing}`;
    el.style.transform = "translate(0px, 0px) scale(1, 1)";
  });

  if (onDone) {
    window.setTimeout(onDone, durationMs);
  }
}

export default function EquityReturnChart({
  ticker,
  label = "Return Since Period Start",
  mode = "return",
  axisFontSize = 11,
  initialRange = "ytd",
  initialData,
  priceLayout = "stacked",
  expandable = false,
}: {
  ticker: string;
  label?: string;
  mode?: "return" | "price";
  axisFontSize?: number;
  initialRange?: RangeKey;
  initialData?: TickerPerformanceSeries;
  /** "inline" puts the % change to the left of the price on one line instead
   * of stacking them, shortening the card's header — used where many of
   * these charts sit close together (e.g. U.S. Bond Markets). */
  priceLayout?: "stacked" | "inline";
  /** Adds an expand button that grows this card into a large centered
   * overlay, animated from the card's own position/size (not just toggled
   * instantly). */
  expandable?: boolean;
}) {
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [data, setData] = useState<TickerPerformanceSeries | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cacheRef = useRef(
    new Map<RangeKey, TickerPerformanceSeries>(initialData ? [[initialRange, initialData]] : [])
  );

  const cardRef = useRef<HTMLDivElement>(null);
  const overlayCardRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);

  function openExpand() {
    setExpanded(true);
    setOverlayMounted(true);
  }

  function closeExpand() {
    const card = cardRef.current;
    const overlay = overlayCardRef.current;
    if (!card || !overlay) {
      setExpanded(false);
      setOverlayMounted(false);
      return;
    }
    setExpanded(false);
    // Animate the overlay back down to the small card's own rect, then swap
    // back to showing the small card once it's fully shrunk away.
    const target = card.getBoundingClientRect();
    const from = overlay.getBoundingClientRect();
    const dx = target.left + target.width / 2 - (from.left + from.width / 2);
    const dy = target.top + target.height / 2 - (from.top + from.height / 2);
    overlay.style.transition = "none";
    overlay.style.transform = "translate(0px, 0px) scale(1, 1)";
    void overlay.getBoundingClientRect();
    requestAnimationFrame(() => {
      overlay.style.transition = "transform 220ms ease-in, opacity 220ms ease-in";
      overlay.style.transform = `translate(${dx}px, ${dy}px) scale(${target.width / from.width}, ${
        target.height / from.height
      })`;
      overlay.style.opacity = "0";
    });
    window.setTimeout(() => setOverlayMounted(false), 220);
  }

  useEffect(() => {
    if (!expanded || !overlayMounted) return;
    const card = cardRef.current;
    const overlay = overlayCardRef.current;
    if (!card || !overlay) return;
    const from = card.getBoundingClientRect();
    overlay.style.opacity = "1";
    flip(overlay, from, 260, "ease-out");
  }, [expanded, overlayMounted]);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeExpand();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  useEffect(() => {
    const cached = cacheRef.current.get(range);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/equity/performance?ticker=${encodeURIComponent(ticker)}&range=${range}`)
      .then((res) => res.json())
      .then((json: TickerPerformanceSeries) => {
        if (cancelled) return;
        cacheRef.current.set(range, json);
        setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, ticker]);

  const points = useMemo(() => data?.points ?? [], [data]);
  const padding = useMemo(
    () => ({ top: 16, right: 16, bottom: axisFontSize + 14, left: Math.max(64, axisFontSize * 6) }),
    [axisFontSize]
  );

  const { path, yTicks, xLabels, plotX } = useMemo(() => {
    const plotWidth = WIDTH - padding.left - padding.right;
    const plotHeight = HEIGHT - padding.top - padding.bottom;
    if (points.length < 2) return { path: "", yTicks: [], xLabels: [], plotX: undefined };

    const values = points.map((p) => (mode === "price" ? p.price : p.value));
    let min = mode === "price" ? Math.min(...values) : Math.min(...values, 0);
    let max = mode === "price" ? Math.max(...values) : Math.max(...values, 0);
    if (min === max) {
      min -= 0.01;
      max += 0.01;
    }
    const pad = (max - min) * 0.1;
    min -= pad;
    max += pad;

    function x(i: number) {
      return padding.left + (i / (points.length - 1)) * plotWidth;
    }
    function y(v: number) {
      return padding.top + (1 - (v - min) / (max - min)) * plotHeight;
    }

    const path = values
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" ");

    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
      const v = min + ((max - min) * i) / tickCount;
      return { value: v, y: y(v) };
    });

    const maxXLabels = Math.max(2, Math.min(6, Math.floor(plotWidth / (axisFontSize * 6))));
    const xLabels = evenIndices(points.length, maxXLabels).map((idx) => ({
      label: formatShortDate(points[idx].date),
      x: x(idx),
      idx,
    }));

    return { path, yTicks, xLabels, plotX: x };
  }, [points, mode, padding, axisFontSize]);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || points.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const plotWidth = WIDTH - padding.left - padding.right;
    const ratio = (relX - padding.left) / plotWidth;
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const currentReturn = points.at(-1)?.value ?? null;
  const currentPrice = points.at(-1)?.price ?? null;
  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;

  function renderPriceRow() {
    if (currentReturn === null) return null;
    if (mode === "price" && priceLayout === "inline") {
      return (
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${currentReturn >= 0 ? "text-positive" : "text-negative"}`}>
            {formatPercent(currentReturn)}
          </p>
          <p className="text-xl font-bold text-foreground">{formatNumber(currentPrice)}</p>
        </div>
      );
    }
    return (
      <div className="text-right">
        <p
          className={`text-xl font-bold ${
            mode === "price" ? "text-foreground" : currentReturn >= 0 ? "text-positive" : "text-negative"
          }`}
        >
          {mode === "price" ? formatNumber(currentPrice) : formatPercent(currentReturn)}
        </p>
        {mode === "price" && (
          <p className={`text-sm font-semibold ${currentReturn >= 0 ? "text-positive" : "text-negative"}`}>
            {formatPercent(currentReturn)}
          </p>
        )}
      </div>
    );
  }

  function renderBody() {
    return (
      <>
        <div className="mt-4 flex flex-wrap gap-1">
          {RANGE_LABELS.map((r) => (
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

        <div className="relative mt-4">
          {loading ? (
            <p className="py-20 text-center text-sm text-muted">Loading…</p>
          ) : points.length < 2 ? (
            <p className="py-20 text-center text-sm text-muted">Not enough data to chart this period.</p>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {yTicks.map((t) => (
                <g key={t.value}>
                  <line
                    x1={padding.left}
                    x2={WIDTH - padding.right}
                    y1={t.y}
                    y2={t.y}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text x={4} y={t.y + 4} fontSize={axisFontSize} fill="var(--muted)">
                    {mode === "price" ? formatNumber(t.value) : formatPercent(t.value, 0)}
                  </text>
                </g>
              ))}
              <path
                d={path}
                fill="none"
                stroke={currentReturn !== null && currentReturn >= 0 ? "var(--positive)" : "var(--negative)"}
                strokeWidth={2}
              />
              {hoverPoint && plotX && (
                <line
                  x1={plotX(hoverIndex!)}
                  x2={plotX(hoverIndex!)}
                  y1={padding.top}
                  y2={HEIGHT - padding.bottom}
                  stroke="var(--muted)"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              )}
              {xLabels.map((l, i) => (
                <text
                  key={l.idx}
                  x={l.x}
                  y={HEIGHT - 6}
                  fontSize={axisFontSize}
                  fill="var(--muted)"
                  textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
                >
                  {l.label}
                </text>
              ))}
            </svg>
          )}

          {hoverPoint && (
            <div className="pointer-events-none absolute left-2 top-0 rounded-md border border-border bg-surface px-2 py-1 text-xs shadow">
              <p className="font-medium text-foreground">{formatPointDateTime(hoverPoint.date)}</p>
              <p className={hoverPoint.value >= 0 ? "text-positive" : "text-negative"}>
                {formatNumber(hoverPoint.price)} ({formatPercent(hoverPoint.value)})
              </p>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div ref={cardRef} className="rounded-lg border border-border bg-surface p-5" style={{ opacity: overlayMounted ? 0 : 1 }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{label}</h2>
            {expandable && (
              <button
                onClick={openExpand}
                aria-label="Expand"
                className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
              >
                <ExpandIcon />
              </button>
            )}
          </div>
          {renderPriceRow()}
        </div>
        {renderBody()}
      </div>

      {overlayMounted && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeExpand}
        >
          <div
            ref={overlayCardRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl rounded-lg border border-border bg-surface p-6 opacity-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="text-xl font-semibold text-foreground">{label}</h2>
              <div className="flex items-center gap-3">
                {renderPriceRow()}
                <button
                  onClick={closeExpand}
                  aria-label="Close"
                  className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
            {renderBody()}
          </div>
        </div>
      )}
    </>
  );
}
