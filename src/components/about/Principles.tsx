"use client";

import type { ReactNode } from "react";
import Reveal from "./Reveal";

const I = ({ children }: { children: ReactNode }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

export const PRINCIPLES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Buy below intrinsic value",
    body: "Invest in companies that trade below their intrinsic value, using a Discounted Cash Flow (DCF) model to determine a company’s intrinsic price.",
    icon: <I><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></I>,
  },
  {
    title: "Demand a margin of safety",
    body: "Purchase equities that trade well below (at least 15%) their intrinsic value. This provides a cushion in instances where there are errors in your assumptions when building a DCF.",
    icon: <I><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /></I>,
  },
  {
    title: "Know the business A to Z",
    body: "It is less difficult to understand Nike’s business model than, say, a pharmaceutical company or a defense contractor. It’s important when investing in a company to understand their business model.",
    icon: <I><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></I>,
  },
  {
    title: "Find the moat",
    body: "Identify durable competitive advantages that protect long-term growth and profitability. These are known as economic moats.",
    icon: <I><path d="M4 21V10l4-3 4 3 4-3 4 3v11" /><path d="M9 21v-5h6v5" /></I>,
  },
  {
    title: "Efficient capital allocation",
    body: "The company should allocate capital efficiently.",
    icon: <I><circle cx="12" cy="12" r="9" /><path d="M12 3v9l6 4" /></I>,
  },
  {
    title: "Growth over cheapness",
    body: "Growth potential is of higher importance than the cheapest price.",
    icon: <I><path d="M12 20V10" /><path d="M8 14l4-4 4 4" /><path d="M5 4h14" /></I>,
  },
  {
    title: "Hold for the long term",
    body: "We are not day-traders; frankly, if you aspire to be one, you’ll have a hard time in the SMIF.",
    icon: <I><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5" /><path d="M9 2h6" /></I>,
  },
  {
    title: "Owner earnings",
    body: "Focus on Owner Earnings, the cash a business actually generates, not Reported Earnings.",
    icon: <I><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></I>,
  },
  {
    title: "Emotional discipline",
    body: "Not all returns come overnight; our Analysts approach investments with a sober and rational mind.",
    icon: <I><path d="M12 21c-4-3-8-6.5-8-11a4 4 0 018-1 4 4 0 018 1c0 4.5-4 8-8 11z" /></I>,
  },
];

export default function Principles({
  active,
  onHover,
}: {
  active?: number;
  onHover?: (index: number | null) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {PRINCIPLES.map((p, i) => (
        <Reveal key={p.title} delay={(i % 3) * 110}>
          <div
            onMouseEnter={() => onHover?.(i)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(i)}
            onBlur={() => onHover?.(null)}
            tabIndex={0}
            className={`group h-full rounded-2xl border bg-surface p-6 outline-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand/5 ${
              active === i ? "border-brand/60 shadow-lg shadow-brand/10" : "border-border hover:border-brand/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-6deg]">
                {p.icon}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-muted">
                Principle {i + 1}
              </span>
            </div>
            <p className="mt-5 text-[17px] font-semibold text-foreground">{p.title}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-body">{p.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
