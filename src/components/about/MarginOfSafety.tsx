"use client";

import { useState } from "react";

const INTRINSIC = 100;
const MIN = 40;
const MAX = 140;
const BUY_LINE = INTRINSIC * 0.85;

const pct = (v: number) => `${((v - MIN) / (MAX - MIN)) * 100}%`;

export default function MarginOfSafety() {
  const [price, setPrice] = useState(78);
  const discount = (INTRINSIC - price) / INTRINSIC;

  const verdict =
    discount >= 0.15
      ? { label: "Buy zone", tone: "text-positive", note: "At least 15% below intrinsic value. There's room for error in the assumptions." }
      : discount >= 0
        ? { label: "Watchlist", tone: "text-foreground", note: "Below intrinsic value, but not by enough to cover a mistake in the DCF." }
        : { label: "Pass", tone: "text-negative", note: "Trading above what we think the business is worth." };

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">Market price</p>
          <p className="mt-1 text-[48px] font-bold leading-none tabular-nums text-foreground">${price}</p>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">Margin of safety</p>
          <p
            className={`mt-1 text-[48px] font-bold leading-none tabular-nums transition-colors duration-500 ${verdict.tone}`}
          >
            {discount >= 0 ? "" : "−"}
            {Math.abs(Math.round(discount * 100))}%
          </p>
        </div>
      </div>

      {/* Track */}
      <div className="relative mt-12 h-16">
        <div className="absolute inset-x-0 top-6 h-4 overflow-hidden rounded-full bg-background">
          <div className="absolute inset-y-0 left-0 bg-positive/25" style={{ width: pct(BUY_LINE) }} />
          <div
            className="absolute inset-y-0 bg-muted/15"
            style={{ left: pct(BUY_LINE), width: `calc(${pct(INTRINSIC)} - ${pct(BUY_LINE)})` }}
          />
          <div className="absolute inset-y-0 right-0 bg-negative/15" style={{ left: pct(INTRINSIC) }} />
        </div>

        {/* intrinsic value marker */}
        <div className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pct(INTRINSIC) }}>
          <div className="mx-auto h-[52px] w-0.5 bg-foreground" />
          <p className="mt-1 whitespace-nowrap text-[12px] font-semibold text-foreground">Intrinsic value $100</p>
        </div>
        <div className="absolute top-3 -translate-x-1/2" style={{ left: pct(BUY_LINE) }}>
          <div className="mx-auto h-10 w-px border-l border-dashed border-positive" />
          <p className="mt-6 whitespace-nowrap text-[12px] font-semibold text-positive">−15%</p>
        </div>

        {/* price puck */}
        <div
          className="pointer-events-none absolute top-[14px] -translate-x-1/2 transition-[left] duration-150 ease-out"
          style={{ left: pct(price) }}
        >
          <div className="h-8 w-8 rounded-full border-4 border-surface bg-brand shadow-lg ring-4 ring-brand/20" />
        </div>

        {/* the track itself is the slider */}
        <input
          type="range"
          min={MIN}
          max={MAX}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          aria-label="Market price"
          className="absolute inset-x-0 top-2 h-10 w-full cursor-grab opacity-0 active:cursor-grabbing"
        />
      </div>
      <p className="mt-10 text-center text-[13px] text-muted">Drag the puck to change the market price</p>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p key={verdict.label} className={`animate-fade-in-down text-[24px] font-bold ${verdict.tone}`} style={{ animationDuration: "0.5s" }}>
          {verdict.label}
        </p>
        <p className="text-[15px] text-body">{verdict.note}</p>
      </div>
    </div>
  );
}
