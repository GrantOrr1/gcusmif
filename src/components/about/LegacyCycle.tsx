"use client";

import { useEffect, useState } from "react";
import { useInView } from "./Reveal";

const STAGES = [
  { title: "Join", body: "New analysts learn the process from the students already in the fund." },
  { title: "Grow", body: "You take on more of the research, the modeling and the pitching yourself." },
  { title: "Lead & teach", body: "As a senior analyst or Sector Head, you train the class coming in behind you." },
  { title: "Graduate", body: "You head into your career, and the next class steps up to carry it forward." },
];

const C = 150; // svg center
const R = 108; // ring radius

const nodePos = (i: number) => {
  const a = (i * 90 - 90) * (Math.PI / 180); // start at the top, go clockwise
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
};

export default function LegacyCycle() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [tick, setTick] = useState(0); // keeps increasing so the marker never spins backwards

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(id);
  }, [inView]);

  const active = tick % STAGES.length;

  return (
    <div ref={ref}>
      <div className="mx-auto w-full max-w-[340px]">
        <svg viewBox="0 0 300 300" className="w-full" role="img" aria-label="Cycle: join, grow, lead and teach, graduate">
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border)" strokeWidth="2" />
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="var(--brand)"
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeDasharray="2 7"
            strokeLinecap="round"
          />

          {/* travelling marker */}
          <g
            style={{
              transform: `rotate(${tick * 90}deg)`,
              transformOrigin: `${C}px ${C}px`,
              transition: "transform 1400ms cubic-bezier(0.65,0,0.35,1)",
            }}
          >
            <circle cx={C} cy={C - R} r="40" fill="var(--brand)" fillOpacity="0.16" />
            <circle cx={C} cy={C - R} r="6" fill="var(--brand)" />
          </g>

          {STAGES.map((s, i) => {
            const p = nodePos(i);
            const on = i === active;
            return (
              <g key={s.title} style={{ transition: "opacity 500ms" }}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={on ? 30 : 26}
                  fill="var(--surface)"
                  stroke={on ? "var(--brand)" : "var(--border)"}
                  strokeWidth={on ? 2.5 : 1.5}
                  style={{ transition: "all 500ms cubic-bezier(0.34,1.56,0.64,1)" }}
                />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={on ? "var(--brand)" : "var(--muted)"}
                  style={{ transition: "fill 500ms", fontFamily: "var(--font-geist-sans)" }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}

          <text x={C} y={C - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--foreground)" style={{ fontFamily: "var(--font-geist-sans)" }}>
            Passed down
          </text>
          <text x={C} y={C + 12} textAnchor="middle" fontSize="11" fill="var(--muted)" style={{ fontFamily: "var(--font-geist-sans)" }}>
            class to class
          </text>
        </svg>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {STAGES.map((s, i) => {
          const on = i === active;
          return (
            <div
              key={s.title}
              className={`rounded-2xl border px-4 py-3 transition-all duration-500 ${
                on ? "border-brand/50 bg-brand/[0.08] shadow-md shadow-brand/10" : "border-border bg-surface"
              }`}
            >
              <p className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                <span className={`text-[12px] tabular-nums ${on ? "text-brand" : "text-muted"}`}>{i + 1}</span>
                {s.title}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-body">{s.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
