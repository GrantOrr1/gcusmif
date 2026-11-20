"use client";

import { useState } from "react";
import { useInView } from "./Reveal";

const PE_MAX = 40;
const GROWTH_MAX = 30;
const PE_MID = 20;
const GROWTH_MID = 15;

type QuadrantKey = "over" | "fairHigh" | "fairLow" | "value";

const QUADRANTS: Record<
  QuadrantKey,
  { label: string; tone: "negative" | "neutral" | "positive"; blurb: string }
> = {
  over: {
    label: "Over-Priced",
    tone: "negative",
    blurb:
      "High P/E, low growth. You are paying a premium for earnings that are not growing fast enough to justify it.",
  },
  fairHigh: {
    label: "Appropriately Priced",
    tone: "neutral",
    blurb:
      "High P/E, high growth. The market already expects the growth, and the price reflects it.",
  },
  fairLow: {
    label: "Appropriately Priced",
    tone: "neutral",
    blurb: "Low P/E, low growth. The stock looks cheap, but the low growth explains why.",
  },
  value: {
    label: "Value Stocks",
    tone: "positive",
    blurb:
      "Low P/E, high growth. Earnings are growing faster than the price gives credit for. This is the quadrant SMIF analysts hunt in.",
  },
};

function classify(pe: number, growth: number): QuadrantKey {
  const highPE = pe >= PE_MID;
  const highGrowth = growth >= GROWTH_MID;
  if (highPE && !highGrowth) return "over";
  if (highPE && highGrowth) return "fairHigh";
  if (!highPE && !highGrowth) return "fairLow";
  return "value";
}

// Illustrative, unnamed stocks scattered across the matrix.
const SAMPLE_STOCKS: { pe: number; growth: number }[] = [
  { pe: 34, growth: 4 }, { pe: 29, growth: 8 }, { pe: 37, growth: 11 }, { pe: 25, growth: 6 },
  { pe: 31, growth: 22 }, { pe: 36, growth: 27 }, { pe: 24, growth: 19 },
  { pe: 9, growth: 3 }, { pe: 14, growth: 7 }, { pe: 6, growth: 11 }, { pe: 17, growth: 5 },
  { pe: 11, growth: 21 }, { pe: 7, growth: 26 }, { pe: 15, growth: 18 },
];

const pos = (pe: number, growth: number) => ({
  left: `${4 + (growth / GROWTH_MAX) * 92}%`,
  top: `${4 + (1 - pe / PE_MAX) * 92}%`,
});

// Labels sit in each quadrant's outer corner so the stock dots don't cover them.
const CORNER: Record<QuadrantKey, string> = {
  over: "items-start justify-start text-left",
  fairHigh: "items-start justify-end text-right",
  fairLow: "items-end justify-start text-left",
  value: "items-end justify-end text-right",
};

const toneText = {
  negative: "text-negative",
  neutral: "text-foreground",
  positive: "text-positive",
};

export default function ValueMatrix() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [pe, setPe] = useState(12);
  const [growth, setGrowth] = useState(22);
  const [hovered, setHovered] = useState<QuadrantKey | null>(null);

  const yours = classify(pe, growth);
  const focus = hovered ?? yours;
  const info = QUADRANTS[focus];

  const cell = (key: QuadrantKey) => {
    const q = QUADRANTS[key];
    const dim = hovered && hovered !== key;
    const isValue = key === "value";
    return (
      <div
        onMouseEnter={() => setHovered(key)}
        onMouseLeave={() => setHovered(null)}
        className={`flex rounded-xl border p-3 transition-all duration-500 sm:p-4 ${CORNER[key]} ${
          isValue
            ? `border-positive/50 bg-positive/10 ${inView ? "value-glow" : ""}`
            : key === "over"
              ? "border-negative/30 bg-negative/[0.06]"
              : "border-border bg-surface"
        } ${dim ? "opacity-40" : "opacity-100"} ${yours === key ? "scale-[1.015]" : ""}`}
      >
        <span
          className={`text-[13px] font-semibold uppercase tracking-wide sm:text-[15px] ${
            isValue ? "text-positive" : key === "over" ? "text-negative" : "text-muted"
          }`}
        >
          {q.label}
        </span>
      </div>
    );
  };

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
      {/* Matrix */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center justify-between py-2 text-[12px] text-muted">
          <span>High</span>
          <span className="-rotate-90 whitespace-nowrap text-[13px] font-semibold text-foreground">
            P/E Ratio
          </span>
          <span>Low</span>
        </div>
        <div className="flex-1">
          <div className="relative aspect-square w-full">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2">
              {cell("over")}
              {cell("fairHigh")}
              {cell("fairLow")}
              {cell("value")}
            </div>

            {/* sample stocks fly out from the center */}
            {SAMPLE_STOCKS.map((s, i) => {
              const p = inView ? pos(s.pe, s.growth) : { left: "50%", top: "50%" };
              const q = classify(s.pe, s.growth);
              return (
                <span
                  key={i}
                  aria-hidden
                  className={`pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-[1400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    q === "value" ? "bg-positive" : q === "over" ? "bg-negative/70" : "bg-muted/60"
                  } ${hovered && hovered !== q ? "opacity-20" : inView ? "opacity-100" : "opacity-0"}`}
                  style={{ ...p, transitionDelay: `${200 + i * 45}ms` }}
                />
              );
            })}

            {/* your stock */}
            <span
              className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-brand/25 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={pos(pe, growth)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" />
              </svg>
              <span className="sr-only">Your stock</span>
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px] text-muted">
            <span>Low</span>
            <span className="text-[13px] font-semibold text-foreground">Growth Rate</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Controls + readout */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
          Place your own stock
        </p>

        <label className="mt-5 block">
          <span className="flex justify-between text-[14px] text-body">
            <span>P/E ratio</span>
            <span className="font-semibold tabular-nums text-foreground">{pe}x</span>
          </span>
          <input
            type="range"
            min={2}
            max={PE_MAX - 2}
            value={pe}
            onChange={(e) => setPe(Number(e.target.value))}
            className="range-brand mt-2 w-full"
          />
        </label>

        <label className="mt-4 block">
          <span className="flex justify-between text-[14px] text-body">
            <span>Earnings growth rate</span>
            <span className="font-semibold tabular-nums text-foreground">{growth}%</span>
          </span>
          <input
            type="range"
            min={1}
            max={GROWTH_MAX - 1}
            value={growth}
            onChange={(e) => setGrowth(Number(e.target.value))}
            className="range-brand mt-2 w-full"
          />
        </label>

        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[13px] text-muted">{hovered ? "This quadrant" : "Your stock lands in"}</p>
          <p
            key={focus}
            className={`animate-fade-in-down mt-1 text-[26px] font-bold ${toneText[info.tone]}`}
            style={{ animationDuration: "0.5s" }}
          >
            {info.label}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-body">{info.blurb}</p>
        </div>
      </div>
    </div>
  );
}
