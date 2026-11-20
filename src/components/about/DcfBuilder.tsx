"use client";

import { useState } from "react";
import { useInView } from "./Reveal";

const BASE_FCF = 5; // free cash flow per share today, illustrative
const TERMINAL_G = 0.03;
const YEARS = [1, 2, 3, 4, 5];

const money = (v: number) => `$${v.toFixed(2)}`;

export default function DcfBuilder() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [growth, setGrowth] = useState(8);
  const [rate, setRate] = useState(12);

  const g = growth / 100;
  const r = rate / 100;

  const rows = YEARS.map((t) => {
    const fcf = BASE_FCF * Math.pow(1 + g, t);
    const pv = fcf / Math.pow(1 + r, t);
    return { t, fcf, pv };
  });
  const fcf5 = rows[4].fcf;
  // Scale to the tallest bar so the chart fills its space; heights animate as it changes.
  const barScale = Math.max(fcf5 * 1.08, 6);
  const terminal = (fcf5 * (1 + TERMINAL_G)) / (r - TERMINAL_G);
  const pvTerminal = terminal / Math.pow(1 + r, 5);
  const pvYears = rows.reduce((s, x) => s + x.pv, 0);
  const intrinsic = pvYears + pvTerminal;
  const yearsShare = pvYears / intrinsic;

  return (
    <div ref={ref} className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        {/* Bars */}
        <div>
          <div className="flex items-center gap-5 text-[13px] text-muted">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border-2 border-dashed border-brand/60" /> Future cash flow
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-brand" /> Worth today (present value)
            </span>
          </div>

          <div className="mt-6 flex h-64 items-end gap-3 sm:gap-5">
            {rows.map((row, i) => (
              <div key={row.t} className="flex h-full flex-1 flex-col justify-end">
                <div className="relative flex-1">
                  {/* future value ghost */}
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-lg border-2 border-dashed border-brand/50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      height: inView ? `${(row.fcf / barScale) * 100}%` : "0%",
                      transitionDelay: inView ? "0ms" : `${i * 90}ms`,
                    }}
                  />
                  {/* present value solid */}
                  <div
                    className="absolute inset-x-1.5 bottom-0 rounded-t-md bg-brand transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{
                      height: inView ? `${(row.pv / barScale) * 100}%` : "0%",
                      transitionDelay: `${150 + i * 90}ms`,
                    }}
                  />
                </div>
                <p className="mt-2 text-center text-[12px] font-semibold tabular-nums text-foreground">{money(row.pv)}</p>
                <p className="text-center text-[11px] text-muted">Yr {row.t}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center font-mono text-[14px] text-body">
            PV = CF<sub>t</sub> ÷ (1 + r)<sup>t</sup>
          </p>
        </div>

        {/* Controls + result */}
        <div className="flex flex-col">
          <label className="block">
            <span className="flex justify-between text-[14px] text-body">
              <span>Cash flow growth (years 1–5)</span>
              <span className="font-semibold tabular-nums text-foreground">{growth}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={20}
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value))}
              className="range-brand mt-2 w-full"
            />
          </label>
          <label className="mt-5 block">
            <span className="flex justify-between text-[14px] text-body">
              <span>Discount rate</span>
              <span className="font-semibold tabular-nums text-foreground">{rate}%</span>
            </span>
            <input
              type="range"
              min={6}
              max={15}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="range-brand mt-2 w-full"
            />
          </label>

          <div className="mt-8 rounded-2xl bg-background p-5">
            <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">Intrinsic value per share</p>
            <p className="mt-1 text-[44px] font-bold leading-none tabular-nums text-foreground">{money(intrinsic)}</p>

            <div className="mt-4 flex h-3 overflow-hidden rounded-full">
              <div className="bg-brand transition-all duration-500" style={{ width: `${yearsShare * 100}%` }} />
              <div className="flex-1 bg-brand/30" />
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted">
              <span>Years 1–5: {money(pvYears)}</span>
              <span>Terminal value: {money(pvTerminal)}</span>
            </div>

            <p className="mt-5 border-t border-border pt-4 text-[14px] text-body">
              With a 15% margin of safety, we&apos;d want to buy below{" "}
              <span className="font-semibold text-positive tabular-nums">{money(intrinsic * 0.85)}</span>.
            </p>
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Illustrative: starts from {money(BASE_FCF)} of free cash flow per share, with a terminal value
            from the constant-growth (Gordon) model at {TERMINAL_G * 100}% growth.
          </p>
        </div>
      </div>
    </div>
  );
}
