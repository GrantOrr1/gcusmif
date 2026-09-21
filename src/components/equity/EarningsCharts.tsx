"use client";

import { useState } from "react";
import type { EarningsQuarter } from "@/lib/yahoo";
import { formatCompactCurrency, formatPrice, formatPercent } from "@/lib/format";

const WIDTH = 640;
const HEIGHT = 300;
const PADDING = { top: 20, right: 16, bottom: 36, left: 64 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

export function EpsDotPlot({ points }: { points: EarningsQuarter[] }) {
  const [basis, setBasis] = useState<"gaap" | "normalized">("gaap");
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  function actualFor(p: EarningsQuarter) {
    return basis === "gaap" ? p.epsGaap : p.epsNormalized;
  }

  const values = points.flatMap((p) => [p.epsEstimate, actualFor(p)]).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = values.length > 0 ? Math.min(...values, 0) : 0;
  const pad = (max - min) * 0.15 || 0.1;
  const scaleMin = min - pad;
  const scaleMax = max + pad;
  const ticks = niceTicks(scaleMin, scaleMax);

  function x(i: number) {
    return PADDING.left + ((i + 0.5) / Math.max(points.length, 1)) * plotWidth;
  }
  function y(v: number) {
    return PADDING.top + (1 - (v - scaleMin) / (scaleMax - scaleMin || 1)) * plotHeight;
  }

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">No data available.</p>;
  }

  const hoverPoint = hover !== null ? points[hover] : null;
  const hoverActual = hoverPoint ? actualFor(hoverPoint) : null;
  const hoverSurprise =
    hoverPoint && hoverActual !== null && hoverPoint.epsEstimate
      ? hoverActual / hoverPoint.epsEstimate - 1
      : null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-muted" style={{ backgroundColor: "transparent" }} />
            Estimate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
            Actual
          </span>
        </div>
        <div className="flex shrink-0 gap-1 rounded-md border border-border p-0.5">
          <button
            onClick={() => setBasis("gaap")}
            className={`rounded px-2 py-1 text-xs font-medium ${
              basis === "gaap" ? "bg-brand text-white" : "text-muted hover:text-foreground"
            }`}
          >
            GAAP
          </button>
          <button
            onClick={() => setBasis("normalized")}
            className={`rounded px-2 py-1 text-xs font-medium ${
              basis === "normalized" ? "bg-brand text-white" : "text-muted hover:text-foreground"
            }`}
          >
            Normalized
          </button>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text x={6} y={y(t) + 5} fontSize={14} fill="var(--muted)">
                {t.toFixed(2)}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const estimate = p.epsEstimate;
            const actual = actualFor(p);
            const cx = x(i);
            const isHover = hover === i;
            return (
              <g
                key={`${p.label}-${i}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={cx - plotWidth / points.length / 2}
                  y={PADDING.top}
                  width={plotWidth / points.length}
                  height={plotHeight}
                  fill={isHover ? "var(--background)" : "transparent"}
                />
                {estimate !== null && actual !== null && (
                  <line
                    x1={cx}
                    x2={cx}
                    y1={y(estimate)}
                    y2={y(actual)}
                    stroke="var(--muted)"
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                  />
                )}
                {estimate !== null && (
                  <circle
                    cx={cx}
                    cy={y(estimate)}
                    r={16.875}
                    fill="var(--surface)"
                    stroke="var(--muted)"
                    strokeWidth={2}
                  />
                )}
                {actual !== null && <circle cx={cx} cy={y(actual)} r={16.875} fill="var(--brand)" />}
                <text
                  x={cx}
                  y={HEIGHT - PADDING.bottom + 22}
                  fontSize={14}
                  fontWeight={500}
                  textAnchor="middle"
                  fill="var(--muted)"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverPoint && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(x(hover!) / WIDTH) * 100}%`,
              transform: hover! > points.length / 2 ? "translateX(-100%)" : undefined,
            }}
          >
            <p className="font-medium text-foreground">{hoverPoint.label}</p>
            <p className="text-muted">Estimate {formatPrice(hoverPoint.epsEstimate)}</p>
            <p className="text-foreground">
              Actual ({basis === "gaap" ? "GAAP" : "Normalized"}) {formatPrice(hoverActual)}
            </p>
            {hoverSurprise !== null && (
              <p className={hoverSurprise >= 0 ? "text-positive" : "text-negative"}>
                Surprise {formatPercent(hoverSurprise, 1)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EbitdaRevenueChart({ points }: { points: EarningsQuarter[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const values = points.flatMap((p) => [p.revenue, p.ebitda]).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values, 0) : 1;
  const ticks = niceTicks(0, max);

  function x(i: number) {
    return PADDING.left + ((i + 0.5) / Math.max(points.length, 1)) * plotWidth;
  }
  function y(v: number) {
    return PADDING.top + (1 - v / (max || 1)) * plotHeight;
  }

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">No data available.</p>;
  }

  function linePath(key: "revenue" | "ebitda") {
    const coords = points
      .map((p, i) => (p[key] !== null ? `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]!).toFixed(1)}` : null))
      .filter((v): v is string => v !== null);
    return coords.join(" ");
  }

  const hoverPoint = hover !== null ? points[hover] : null;
  const hoverMargin =
    hoverPoint && hoverPoint.revenue && hoverPoint.ebitda !== null
      ? hoverPoint.ebitda / hoverPoint.revenue
      : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--brand)]" />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--positive)]" />
          EBITDA
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text x={6} y={y(t) + 5} fontSize={14} fill="var(--muted)">
                {formatCompactCurrency(t)}
              </text>
            </g>
          ))}

          <path d={linePath("revenue")} fill="none" stroke="var(--brand)" strokeWidth={2.5} />
          <path d={linePath("ebitda")} fill="none" stroke="var(--positive)" strokeWidth={2.5} />

          {points.map((p, i) => (
            <g
              key={`${p.label}-${i}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={PADDING.left + (i / points.length) * plotWidth}
                y={PADDING.top}
                width={plotWidth / points.length}
                height={plotHeight}
                fill={hover === i ? "var(--background)" : "transparent"}
              />
              {p.revenue !== null && <circle cx={x(i)} cy={y(p.revenue)} r={4} fill="var(--brand)" />}
              {p.ebitda !== null && <circle cx={x(i)} cy={y(p.ebitda)} r={4} fill="var(--positive)" />}
              <text
                x={x(i)}
                y={HEIGHT - PADDING.bottom + 22}
                fontSize={14}
                fontWeight={500}
                textAnchor="middle"
                fill="var(--muted)"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>

        {hoverPoint && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(x(hover!) / WIDTH) * 100}%`,
              transform: hover! > points.length / 2 ? "translateX(-100%)" : undefined,
            }}
          >
            <p className="font-medium text-foreground">{hoverPoint.label}</p>
            <p className="text-foreground">Revenue {formatCompactCurrency(hoverPoint.revenue)}</p>
            <p className="text-positive">EBITDA {formatCompactCurrency(hoverPoint.ebitda)}</p>
            {hoverMargin !== null && <p className="text-muted">Margin {formatPercent(hoverMargin, 1)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function RevenueEarningsChart({ points }: { points: EarningsQuarter[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const values = points.flatMap((p) => [p.revenue, p.earnings]).filter((v): v is number => v !== null);
  const max = values.length > 0 ? Math.max(...values, 0) : 1;
  const ticks = niceTicks(0, max);

  function y(v: number) {
    return PADDING.top + (1 - v / (max || 1)) * plotHeight;
  }

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">No data available.</p>;
  }

  const groupWidth = plotWidth / points.length;
  const barWidth = Math.min(36, groupWidth * 0.32);
  const hoverPoint = hover !== null ? points[hover] : null;
  const hoverMargin =
    hoverPoint && hoverPoint.revenue ? (hoverPoint.earnings ?? 0) / hoverPoint.revenue : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand)]" />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--positive)]" />
          Earnings
        </span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text x={6} y={y(t) + 5} fontSize={14} fill="var(--muted)">
                {formatCompactCurrency(t)}
              </text>
            </g>
          ))}

          {points.map((p, i) => {
            const groupX = PADDING.left + i * groupWidth + groupWidth / 2;
            const isHover = hover === i;
            return (
              <g
                key={`${p.label}-${i}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={PADDING.left + i * groupWidth}
                  y={PADDING.top}
                  width={groupWidth}
                  height={plotHeight}
                  fill={isHover ? "var(--background)" : "transparent"}
                />
                {p.revenue !== null && (
                  <rect
                    x={groupX - barWidth - 2}
                    y={y(p.revenue)}
                    width={barWidth}
                    height={Math.max(plotHeight - (y(p.revenue) - PADDING.top), 1)}
                    fill="var(--brand)"
                    rx={2}
                  />
                )}
                {p.earnings !== null && (
                  <rect
                    x={groupX + 2}
                    y={y(p.earnings)}
                    width={barWidth}
                    height={Math.max(plotHeight - (y(p.earnings) - PADDING.top), 1)}
                    fill="var(--positive)"
                    rx={2}
                  />
                )}
                <text
                  x={groupX}
                  y={HEIGHT - PADDING.bottom + 22}
                  fontSize={14}
                  fontWeight={500}
                  textAnchor="middle"
                  fill="var(--muted)"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverPoint && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${((PADDING.left + hover! * groupWidth + groupWidth / 2) / WIDTH) * 100}%`,
              transform: hover! > points.length / 2 ? "translateX(-100%)" : undefined,
            }}
          >
            <p className="font-medium text-foreground">{hoverPoint.label}</p>
            <p className="text-foreground">Revenue {formatCompactCurrency(hoverPoint.revenue)}</p>
            <p className="text-positive">Earnings {formatCompactCurrency(hoverPoint.earnings)}</p>
            {hoverMargin !== null && <p className="text-muted">Margin {formatPercent(hoverMargin, 1)}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
