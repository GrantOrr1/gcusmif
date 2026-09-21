"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PerformanceSeries, RangeKey } from "@/lib/performance";
import { formatPercent, formatPointDateTime, formatShortDate } from "@/lib/format";
import { hashColor } from "@/lib/colorHash";
import { evenIndices } from "@/lib/chartTicks";
import { benchmarkForSector } from "@/lib/sectors";

const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "1d", label: "1 Day" },
  { key: "5d", label: "5 Days" },
  { key: "1mo", label: "1 Month" },
  { key: "3mo", label: "3 Months" },
  { key: "6mo", label: "6 Months" },
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1 Year" },
  { key: "3y", label: "3 Years" },
];

const WIDTH = 720;
const HEIGHT = 320;
const PADDING = { top: 16, right: 16, bottom: 28, left: 72 };

type EquityOption = { ticker: string; companyName: string | null };

export default function SectorPerformanceChart({
  sectorCode,
  sectorLabel,
  equities,
  initialRange,
  initialData,
}: {
  sectorCode: string;
  sectorLabel: string;
  equities: EquityOption[];
  initialRange: RangeKey;
  initialData: PerformanceSeries;
}) {
  const [range, setRange] = useState<RangeKey>(initialRange);
  const [data, setData] = useState<PerformanceSeries>(initialData);
  const [loading, setLoading] = useState(false);
  const [activeEquities, setActiveEquities] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cacheRef = useRef(new Map<RangeKey, PerformanceSeries>([[initialRange, initialData]]));

  useEffect(() => {
    const cached = cacheRef.current.get(range);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/portfolio/performance?range=${range}`)
      .then((res) => res.json())
      .then((json: PerformanceSeries) => {
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
  }, [range]);

  function toggleEquity(ticker: string) {
    setActiveEquities((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  const sectorBenchmark = benchmarkForSector(sectorCode);
  const hasBenchmark = data.points.some((p) => p.sectorBenchmarks[sectorCode] !== undefined);

  const { linePaths, yTicks, xLabels, plot } = useMemo(() => {
    const points = data.points;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

    if (points.length < 2) {
      return { linePaths: [], yTicks: [], xLabels: [], plot: { plotWidth, plotHeight } };
    }

    const visibleSeries: { key: string; color: string; width: number; dashed?: boolean }[] = [
      { key: "__sector__", color: "var(--brand)", width: 2.5 },
      ...Array.from(activeEquities).map((t) => ({
        key: t,
        color: hashColor(t),
        width: 1.5,
      })),
      { key: "__benchmark__", color: "#ffffff", width: 1.75, dashed: true },
    ];

    const values: number[] = [];
    for (const p of points) {
      const sectorVal = p.sectors[sectorCode];
      if (sectorVal !== undefined) values.push(sectorVal);
      const benchmarkVal = p.sectorBenchmarks[sectorCode];
      if (benchmarkVal !== undefined) values.push(benchmarkVal);
      for (const t of activeEquities) {
        if (p.holdings[t] !== undefined) values.push(p.holdings[t]);
      }
    }
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 0);
    if (min === max) {
      min -= 0.01;
      max += 0.01;
    }
    const pad = (max - min) * 0.1;
    min -= pad;
    max += pad;

    function x(i: number) {
      return PADDING.left + (i / (points.length - 1)) * plotWidth;
    }
    function y(v: number) {
      return PADDING.top + (1 - (v - min) / (max - min)) * plotHeight;
    }

    function valueFor(series: { key: string }, p: (typeof points)[number]) {
      if (series.key === "__sector__") return p.sectors[sectorCode];
      if (series.key === "__benchmark__") return p.sectorBenchmarks[sectorCode];
      return p.holdings[series.key];
    }

    const linePaths = visibleSeries
      .map((series) => {
        const d = points
          .map((p, i) => {
            const value = valueFor(series, p);
            if (value === undefined) return null;
            return `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(value).toFixed(1)}`;
          })
          .filter(Boolean)
          .join(" ");
        return { key: series.key, color: series.color, width: series.width, dashed: series.dashed, d };
      })
      .filter((line) => line.d);

    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => {
      const v = min + ((max - min) * i) / tickCount;
      return { value: v, y: y(v) };
    });

    const xLabels = evenIndices(points.length, 6).map((idx) => ({
      label: formatShortDate(points[idx].date),
      x: x(idx),
      idx,
    }));

    return { linePaths, yTicks, xLabels, plot: { plotWidth, plotHeight, x, y, min, max } };
  }, [data, activeEquities, sectorCode]);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || data.points.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const ratio = (relX - PADDING.left) / plotWidth;
    const idx = Math.round(ratio * (data.points.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.points.length - 1, idx)));
  }

  const currentReturn = data.points.at(-1)?.sectors[sectorCode] ?? null;
  const hoverPoint = hoverIndex !== null ? data.points[hoverIndex] : null;
  const plotX = "x" in plot ? plot.x : undefined;

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{sectorLabel} Performance</h2>
          <p className="text-xs text-muted">
            Approximate return of current {sectorLabel.toLowerCase()} holdings if held over the
            selected period.
          </p>
        </div>
        {currentReturn !== null && (
          <p
            className={`text-xl font-bold ${currentReturn >= 0 ? "text-positive" : "text-negative"}`}
          >
            {formatPercent(currentReturn)}
          </p>
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

      <div className="mt-3 flex flex-wrap gap-2">
        {hasBenchmark && (
          <span className="flex items-center gap-1.5 rounded-full border-2 border-white px-2.5 py-1 text-xs font-medium text-foreground">
            <span className="h-2 w-2 rounded-full border border-white bg-transparent" />
            {sectorBenchmark.label}
          </span>
        )}
        {equities.map((eq) => {
          const active = activeEquities.has(eq.ticker);
          return (
            <button
              key={eq.ticker}
              onClick={() => toggleEquity(eq.ticker)}
              title={eq.companyName ?? eq.ticker}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                active
                  ? "border-transparent text-white"
                  : "border-border text-muted hover:text-foreground"
              }`}
              style={active ? { backgroundColor: hashColor(eq.ticker) } : undefined}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: active ? "white" : hashColor(eq.ticker) }}
              />
              {eq.ticker}
            </button>
          );
        })}
      </div>

      <div className="relative mt-4">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/60 text-xs text-muted">
            Loading…
          </div>
        )}
        {data.points.length < 2 ? (
          <p className="py-16 text-center text-sm text-muted">
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
                  x1={PADDING.left}
                  x2={WIDTH - PADDING.right}
                  y1={t.y}
                  y2={t.y}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text x={4} y={t.y + 4} fontSize={10} fill="var(--muted)">
                  {formatPercent(t.value, 0)}
                </text>
              </g>
            ))}

            {linePaths.map((line) => (
              <path
                key={line.key}
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth={line.width}
                strokeDasharray={line.dashed ? "5,4" : undefined}
              />
            ))}

            {hoverPoint && plotX && (
              <line
                x1={plotX(hoverIndex!)}
                x2={plotX(hoverIndex!)}
                y1={PADDING.top}
                y2={HEIGHT - PADDING.bottom}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            )}

            {xLabels.map((l, i) => (
              <text
                key={l.idx}
                x={l.x}
                y={HEIGHT - 8}
                fontSize={10}
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
            <p className="text-brand">
              {sectorLabel} {formatPercent(hoverPoint.sectors[sectorCode] ?? 0)}
            </p>
            {hoverPoint.sectorBenchmarks[sectorCode] !== undefined && (
              <p className="text-foreground">
                {sectorBenchmark.label} {formatPercent(hoverPoint.sectorBenchmarks[sectorCode])}
              </p>
            )}
            {Array.from(activeEquities).map((t) => (
              <p key={t} style={{ color: hashColor(t) }}>
                {t} {formatPercent(hoverPoint.holdings[t] ?? 0)}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
