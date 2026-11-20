"use client";

import { useInView } from "./Reveal";

const STEPS = [
  { title: "Identify", body: "Find companies that meet our value investing guidelines." },
  { title: "Due diligence", body: "Dig into filings, the business model, the industry and the moat." },
  { title: "Model", body: "Build the financial model and DCF to estimate intrinsic value." },
  { title: "Report", body: "Write the equity report and build the pitch deck." },
  { title: "Pitch", body: "Present the investment to the entire SMIF." },
  { title: "Manage", body: "Track and manage the position as a current holding." },
];

export default function AnalystPipeline() {
  const [ref, inView] = useInView<HTMLOListElement>(0.3);
  return (
    <ol ref={ref} className="relative grid gap-8 md:grid-cols-6 md:gap-4">
      {/* connector line (desktop) */}
      <div aria-hidden className="absolute left-[8.33%] right-[8.33%] top-6 hidden h-0.5 bg-border md:block">
        <div
          className="h-full origin-left bg-brand transition-transform duration-[1800ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{ transform: inView ? "scaleX(1)" : "scaleX(0)" }}
        />
      </div>
      {STEPS.map((s, i) => (
        <li
          key={s.title}
          className="reveal relative flex gap-4 md:flex-col md:items-center md:text-center"
          data-shown={inView ? "" : undefined}
          style={{ transitionDelay: `${i * 260}ms` }}
        >
          <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-surface text-[16px] font-bold text-brand shadow-sm">
            {i + 1}
          </span>
          <div>
            <p className="text-[17px] font-semibold text-foreground md:mt-4">{s.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-body">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
