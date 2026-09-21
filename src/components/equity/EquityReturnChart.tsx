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

export default function EquityReturnChart({
  ticker,
  label = "Return Since Period Start",
  mode = "return",
  axisFontSize = 11,
  initialRange = "ytd",
  initialData,
}: {
  ticker: string;
  label?: string;
  mode?: "return" | "price";
  axisFontSize?: number;
  initialRange?: RangeKey;
  initialData?: TickerPerformanceSeries;
}) {
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [data, setData] = useState<TickerPerformanceSeries | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cacheRef = useRef(
    new Map<RangeKey, TickerPerformanceSeries>(initialData ? [[initialRange, initialData]] : [])
  );

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

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{label}</h2>
        {currentReturn !== null && (
          <div className="text-right">
            <p
              className={`text-xl font-bold ${
                mode === "price"
                  ? "text-foreground"
                  : currentReturn >= 0
                    ? "text-positive"
                    : "text-negative"
              }`}
            >
              {mode === "price" ? formatNumber(currentPrice) : formatPercent(currentReturn)}
            </p>
            {mode === "price" && (
              <p
                className={`text-sm font-semibold ${
                  currentReturn >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {formatPercent(currentReturn)}
              </p>
            )}
          </div>
        )}
      </div>

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
          <p className="py-20 text-center text-sm text-muted">
            Not enough data to chart this period.
          </p>
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
              stroke={
                currentReturn !== null && currentReturn >= 0
                  ? "var(--positive)"
                  : "var(--negative)"
              }
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
              {mode === "price" ? formatNumber(hoverPoint.price) : formatPercent(hoverPoint.value)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
