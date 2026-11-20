"use client";

import { useState } from "react";

const FACE = 1000;
const COUPON = 0.05;
const YEARS = 10;

function bondPrice(marketRate: number) {
  const r = marketRate / 100;
  const c = FACE * COUPON;
  let pv = 0;
  for (let t = 1; t <= YEARS; t++) pv += c / Math.pow(1 + r, t);
  return pv + FACE / Math.pow(1 + r, YEARS);
}

export default function BondSeesaw() {
  const [rate, setRate] = useState(7);
  const price = bondPrice(rate);
  const angle = Math.max(-14, Math.min(14, (rate - 5) * 3.5));
  const status =
    Math.abs(price - FACE) < 0.5 ? "Par" : price > FACE ? "Premium" : "Discount";

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-10">
      <svg viewBox="0 18 600 200" className="w-full" role="img" aria-label={`At a ${rate}% market rate the bond is priced at $${price.toFixed(0)}`}>
        {/* fulcrum */}
        <polygon points="300,150 270,205 330,205" fill="var(--border)" />
        <rect x="200" y="205" width="200" height="6" rx="3" fill="var(--border)" />

        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: "300px 150px",
            transition: "transform 700ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          <rect x="60" y="144" width="480" height="12" rx="6" fill="var(--brand)" />
          {/* rate block */}
          <g>
            <rect x="70" y="84" width="150" height="58" rx="12" fill="var(--background)" stroke="var(--border)" />
            <text x="145" y="108" textAnchor="middle" fontSize="13" fill="var(--muted)">
              Market rate
            </text>
            <text x="145" y="131" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--foreground)">
              {rate}%
            </text>
          </g>
          {/* price block */}
          <g>
            <rect x="380" y="84" width="150" height="58" rx="12" fill="var(--background)" stroke="var(--border)" />
            <text x="455" y="108" textAnchor="middle" fontSize="13" fill="var(--muted)">
              Bond price
            </text>
            <text x="455" y="131" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--foreground)">
              ${price.toFixed(0)}
            </text>
          </g>
        </g>
      </svg>

      <input
        type="range"
        min={1}
        max={9}
        step={0.5}
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        aria-label="Market interest rate"
        className="range-brand mt-4 w-full"
      />

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-[15px] text-body">
          A 10-year, $1,000 bond paying a 5% coupon trades at{" "}
          <span
            className={`font-bold ${
              status === "Premium" ? "text-positive" : status === "Discount" ? "text-negative" : "text-foreground"
            }`}
          >
            {status === "Par" ? "par" : `a ${status.toLowerCase()}`}
          </span>
          .
        </p>
        <p className="text-[13px] text-muted">Rates up, prices down. That&apos;s interest rate risk.</p>
      </div>
    </div>
  );
}
