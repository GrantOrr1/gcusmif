"use client";

import { useEffect, useState } from "react";
import { useInView } from "./Reveal";

function CountUp({ to, run, duration = 1600 }: { to: number; run: boolean; duration?: number }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(to * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, to, duration]);
  return <>{value >= to ? to : value.toFixed(1)}</>;
}

const STATS = [
  { big: "Debt + Equity", small: "Real securities, real positions" },
  { big: "Value", small: "Investing, the Buffett way" },
  { big: "DCF Modeling", small: "Plus equity reports & pitching" },
];

export default function AboutHero() {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* soft background orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="float-slow absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand/15 blur-3xl" />
        <div
          className="float-slow absolute -right-20 top-40 h-80 w-80 rounded-full bg-positive/10 blur-3xl"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <p
          className="reveal text-[13px] font-semibold uppercase tracking-[0.22em] text-brand"
          data-shown={inView ? "" : undefined}
        >
          About the SMIF
        </p>
        <h1
          className="reveal mt-5 text-balance text-[40px] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[64px]"
          data-shown={inView ? "" : undefined}
          style={{ transitionDelay: "120ms" }}
        >
          {/* one gradient across both lines so the color moves through the whole title */}
          <span className="text-shimmer">
            Grand Canyon University&apos;s
            <br />
            Student Managed <span className="whitespace-nowrap">Investment Fund</span>
          </span>
        </h1>

        <div
          className="reveal mx-auto mt-14 w-fit"
          data-shown={inView ? "" : undefined}
          style={{ transitionDelay: "380ms" }}
        >
          <p className="text-[72px] font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-[112px]">
            $<CountUp to={5} run={inView} />M<span className="text-brand">+</span>
          </p>
          <p className="mt-2 text-[15px] font-medium uppercase tracking-[0.16em] text-muted">
            in assets under management
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
          {STATS.map((s, i) => (
            <div
              key={s.big}
              className="reveal rounded-2xl border border-border bg-surface/80 px-5 py-5 backdrop-blur transition-transform duration-300 hover:-translate-y-1"
              data-shown={inView ? "" : undefined}
              style={{ transitionDelay: `${520 + i * 110}ms` }}
            >
              <p className="text-[22px] font-bold text-foreground">{s.big}</p>
              <p className="mt-1 text-[14px] text-muted">{s.small}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
