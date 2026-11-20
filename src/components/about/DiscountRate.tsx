"use client";

import { useState } from "react";

const RISK_LEVELS = [
  { key: "low", label: "Steady giant", note: "A mature, predictable business", premium: 3 },
  { key: "mid", label: "Growing company", note: "Solid, but less certain", premium: 6 },
  { key: "high", label: "Risky upstart", note: "Big upside, big uncertainty", premium: 11 },
] as const;

const REAL_RATE = 2;
const INFLATION = 3;
const YEARS = [0, 1, 2, 3, 4, 5];

export default function DiscountRate() {
  const [choice, setChoice] = useState<"today" | "later" | null>(null);
  const [risk, setRisk] = useState<(typeof RISK_LEVELS)[number]["key"]>("mid");

  const premium = RISK_LEVELS.find((r) => r.key === risk)!.premium;
  const rate = REAL_RATE + INFLATION + premium;
  const pv = (t: number) => 100 / Math.pow(1 + rate / 100, t);

  const blocks = [
    { label: "Real risk-free rate", value: REAL_RATE, cls: "bg-muted/50", why: "What your money earns just for waiting, with no risk." },
    { label: "Inflation", value: INFLATION, cls: "bg-brand/45", why: "Prices rise, so future dollars buy less." },
    { label: "Risk premium", value: premium, cls: "bg-brand", why: "Extra return you demand for the chance things go wrong." },
  ];

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10">
      {/* Step 1: the question */}
      <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-brand">First, a quick question</p>
      <p className="mt-2 text-[22px] font-bold leading-snug text-foreground sm:text-[26px]">
        Would you rather have $100 today, or $100 five years from now?
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {(["today", "later"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setChoice(c)}
            className={`rounded-full border px-5 py-2.5 text-[15px] font-semibold transition-all duration-300 hover:-translate-y-0.5 ${
              choice === c
                ? "border-brand bg-brand text-white shadow-lg shadow-brand/25"
                : "border-border bg-background text-foreground hover:border-brand/50"
            }`}
          >
            {c === "today" ? "$100 today" : "$100 in 5 years"}
          </button>
        ))}
      </div>
      {choice && (
        <p key={choice} className="animate-fade-in-down mt-4 max-w-2xl text-[15px] leading-relaxed text-body" style={{ animationDuration: "0.5s" }}>
          {choice === "today" ? (
            <>
              <span className="font-semibold text-positive">Right call.</span> A dollar today can be invested and grow,
              it isn&apos;t eaten by inflation, and it&apos;s guaranteed. A future dollar is a promise.
            </>
          ) : (
            <>
              <span className="font-semibold text-negative">Most investors wouldn&apos;t.</span> A dollar today can be
              invested and grow, it isn&apos;t eaten by inflation, and it&apos;s guaranteed. A future dollar is a promise.
            </>
          )}{" "}
          The <span className="font-semibold text-foreground">discount rate</span> puts a number on exactly how much less
          that promise is worth.
        </p>
      )}

      <div className="mt-10 grid gap-10 border-t border-border pt-8 lg:grid-cols-2">
        {/* Step 2: build the rate */}
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">Build the discount rate</p>
          <p className="mt-2 text-[15px] text-body">How risky is the company whose cash you&apos;re waiting for?</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {RISK_LEVELS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRisk(r.key)}
                className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-300 ${
                  risk === r.key ? "border-brand bg-brand/10" : "border-border bg-background hover:border-brand/40"
                }`}
              >
                <p className="text-[13px] font-semibold text-foreground">{r.label}</p>
                <p className="mt-0.5 hidden text-[12px] leading-snug text-muted sm:block">{r.note}</p>
              </button>
            ))}
          </div>

          {/* stacked bar */}
          <div className="mt-6 flex h-12 overflow-hidden rounded-xl">
            {blocks.map((b) => (
              <div
                key={b.label}
                className={`flex items-center justify-center text-[13px] font-semibold text-white transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${b.cls}`}
                style={{ width: `${(b.value / 16) * 100}%` }}
              >
                {b.value}%
              </div>
            ))}
            <div className="flex-1 bg-background" />
          </div>
          <ul className="mt-4 space-y-2">
            {blocks.map((b) => (
              <li key={b.label} className="flex gap-3 text-[14px]">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${b.cls}`} />
                <span className="text-body">
                  <span className="font-semibold text-foreground">{b.label}:</span> {b.why}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[15px] text-body">
            Discount rate ={" "}
            <span className="text-[22px] font-bold tabular-nums text-foreground">{rate}%</span>
          </p>
        </div>

        {/* Step 3: the shrinking coins */}
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">
            What $100 from the future is worth today
          </p>
          <div className="mt-6 flex h-44 items-end justify-between gap-1">
            {YEARS.map((t) => {
              const v = pv(t);
              const size = 28 + (v / 100) * 52; // px
              return (
                <div key={t} className="flex flex-1 flex-col items-center">
                  <div
                    className="flex items-center justify-center rounded-full border-2 border-brand/70 bg-brand/10 font-bold tabular-nums text-foreground transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    style={{ width: size, height: size, fontSize: Math.max(10, size / 4.2) }}
                  >
                    ${Math.round(v)}
                  </div>
                  <p className="mt-2 text-[12px] text-muted">{t === 0 ? "Today" : `Yr ${t}`}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 rounded-2xl bg-background px-5 py-4">
            <p className="text-[15px] leading-relaxed text-body">
              At a {rate}% discount rate, $100 arriving in five years is worth{" "}
              <span className="font-bold text-foreground tabular-nums">${pv(5).toFixed(2)}</span> today. The riskier the
              company, the higher the rate, and the less its future cash is worth now.
            </p>
            <p className="mt-3 font-mono text-[13px] text-muted">PV = $100 ÷ (1 + {rate / 100})⁵</p>
          </div>
        </div>
      </div>
    </div>
  );
}
