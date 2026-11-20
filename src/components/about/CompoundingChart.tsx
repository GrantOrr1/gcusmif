"use client";

import { useState } from "react";
import { useInView } from "./Reveal";

const W = 640;
const H = 340;
const PAD = { l: 56, r: 20, t: 20, b: 36 };
const YEARS = 30;
const Y_MAX = 7000;
const PRINCIPAL = 100;

const SERIES = [
  { rate: 5, stroke: "var(--muted)", width: 2, dash: "4 5" },
  { rate: 10, stroke: "var(--brand-hover)", width: 2.5, dash: "10 6" },
  { rate: 15, stroke: "var(--brand)", width: 3.5, dash: undefined },
];

const x = (year: number) => PAD.l + (year / YEARS) * (W - PAD.l - PAD.r);
const y = (v: number) => PAD.t + (1 - v / Y_MAX) * (H - PAD.t - PAD.b);
const fv = (rate: number, year: number) => PRINCIPAL * Math.pow(1 + rate / 100, year);

function pathFor(rate: number) {
  let d = "";
  for (let t = 0; t <= YEARS; t += 0.5) d += `${t === 0 ? "M" : "L"}${x(t).toFixed(1)},${y(fv(rate, t)).toFixed(1)}`;
  return d;
}

const money = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default function CompoundingChart() {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const [year, setYear] = useState(30);

  return (
    <div ref={ref} className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
            $100 held for
          </p>
          <p className="mt-1 text-[44px] font-bold leading-none tabular-nums text-foreground">
            {year} {year === 1 ? "year" : "years"}
          </p>
        </div>
        <div className="flex gap-6">
          {SERIES.map((s) => (
            <div key={s.rate} className="text-right">
              <p className="flex items-center justify-end gap-2 text-[13px] text-muted">
                <svg width="22" height="6" aria-hidden>
                  <line x1="0" y1="3" x2="22" y2="3" stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} />
                </svg>
                {s.rate}%
              </p>
              <p className="mt-1 text-[22px] font-bold tabular-nums text-foreground">{money(fv(s.rate, year))}</p>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-8 w-full" role="img" aria-label="Future value of $100 at 5, 10 and 15 percent over 30 years">
        {[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000].map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.l - 10} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
              {v === 0 ? "$0" : `$${v / 1000}k`}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20, 25, 30].map((t) => (
          <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fontSize="12" fill="var(--muted)">
            {t}
          </text>
        ))}

        <defs>
          {SERIES.map((s, i) => (
            <clipPath key={s.rate} id={`grow-${s.rate}`}>
              <rect
                x={PAD.l - 8}
                y={0}
                width={W - PAD.l - PAD.r + 16}
                height={H}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "left",
                  transform: inView ? "scaleX(1)" : "scaleX(0)",
                  transition: `transform 2000ms cubic-bezier(0.65,0,0.35,1) ${i * 250}ms`,
                }}
              />
            </clipPath>
          ))}
        </defs>
        {SERIES.map((s) => (
          <path
            key={s.rate}
            d={pathFor(s.rate)}
            fill="none"
            stroke={s.stroke}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeDasharray={s.dash}
            clipPath={`url(#grow-${s.rate})`}
          />
        ))}

        {/* scrubber */}
        <line
          x1={x(year)}
          x2={x(year)}
          y1={PAD.t}
          y2={H - PAD.b}
          stroke="var(--foreground)"
          strokeOpacity="0.25"
          strokeWidth="1.5"
          style={{ transition: "all 250ms ease-out" }}
        />
        {SERIES.map((s) => (
          <circle
            key={s.rate}
            cx={x(year)}
            cy={y(fv(s.rate, year))}
            r={s.rate === 15 ? 6 : 4.5}
            fill={s.stroke}
            stroke="var(--surface)"
            strokeWidth="2"
            style={{ transition: "all 250ms ease-out", opacity: inView ? 1 : 0 }}
          />
        ))}
      </svg>
      <p className="-mt-1 text-center text-[12px] text-muted">Years held</p>

      <input
        type="range"
        min={1}
        max={YEARS}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        aria-label="Years held"
        className="range-brand mt-6 w-full"
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {SERIES.map((s) => (
          <div key={s.rate} className="rounded-2xl bg-background px-4 py-3 text-center">
            <p className="text-[12px] uppercase tracking-[0.14em] text-muted">Rule of 72 at {s.rate}%</p>
            <p className="mt-1 text-[15px] text-body">
              Doubles every <span className="font-bold text-foreground">{(72 / s.rate).toFixed(1)} years</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
