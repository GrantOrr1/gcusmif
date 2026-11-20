"use client";

import { useEffect, useRef, useState } from "react";
import { SCENES, type Scene, type Tone } from "./storyScenes";

const HEADER_OFFSET = 80;
const SCENE_VH = 60; // scroll distance per chapter while pinned
const TRACK_VH = 100 + SCENES.length * SCENE_VH;
const STROKE_SPAN = 0.18;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

const TONE: Record<Tone, string> = {
  ink: "var(--foreground)",
  soft: "var(--muted)",
  brand: "var(--brand)",
};

function SketchScene({ scene, draw }: { scene: Scene; draw: number }) {
  const n = scene.strokes.length;
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label={`Sketch: ${scene.title}`}>
      {scene.strokes.map((s, i) => {
        const start = (i / Math.max(1, n - 1)) * (1 - STROKE_SPAN) * 0.9;
        const t = seg(draw, start, start + STROKE_SPAN);
        return (
          <path
            key={i}
            d={s.d}
            fill={s.fill ? "var(--surface)" : "none"}
            fillOpacity={s.fill ? Math.min(1, t * 4) : undefined}
            stroke={TONE[s.tone ?? "ink"]}
            strokeOpacity={s.o ?? (s.tone === "soft" ? 0.8 : 0.92)}
            strokeWidth={s.w ?? 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset={1 - t}
            style={{ visibility: t > 0.001 ? "visible" : "hidden" }}
          />
        );
      })}
      {scene.labels?.map((l) => (
        <text
          key={l.text}
          x={l.x}
          y={l.y}
          textAnchor={l.anchor ?? "middle"}
          fontSize={l.size ?? 7}
          fontWeight={l.weight ?? 600}
          letterSpacing="0.8"
          fill={TONE[l.tone ?? "ink"]}
          style={{ opacity: seg(draw, 0.8, 0.95), fontFamily: "var(--font-geist-sans)" }}
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, color-mix(in srgb, var(--muted) 9%, transparent) 0 1px, transparent 1px 6px)",
      }}
    >
      {children}
    </div>
  );
}

export default function AnalystStory() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const wrap = wrapRef.current;
      if (!wrap) return;
      const vh = window.innerHeight;
      const range = vh + (wrap.offsetHeight - vh);
      setProgress(clamp01((vh - wrap.getBoundingClientRect().top) / Math.max(1, range)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  if (reduced) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        {SCENES.map((s, i) => (
          <div key={s.key}>
            <Panel>
              <SketchScene scene={s} draw={1} />
            </Panel>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand">Chapter {i + 1}</p>
            <p className="mt-1 text-[20px] font-bold text-foreground">{s.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-body">{s.body}</p>
          </div>
        ))}
      </div>
    );
  }

  const N = SCENES.length;
  const pos = progress * N;
  const active = Math.min(N - 1, Math.floor(pos));
  const scene = SCENES[active];

  return (
    <div ref={wrapRef} className="relative" style={{ height: `${TRACK_VH}vh` }}>
      <div className="sticky flex items-center" style={{ top: HEADER_OFFSET, height: `calc(100vh - ${HEADER_OFFSET}px)` }}>
        <div className="grid w-full items-center gap-6 lg:grid-cols-[1fr_1.45fr] lg:gap-14">
          {/* caption + chapter rail */}
          <div className="order-2 lg:order-1">
            <ol className="mb-6 hidden space-y-2 lg:block">
              {SCENES.map((s, i) => {
                const fill = clamp01(pos - i);
                const on = i === active;
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span className="relative h-1 w-10 overflow-hidden rounded-full bg-border">
                      <span className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${fill * 100}%` }} />
                    </span>
                    <span
                      className={`text-[13px] font-medium transition-colors duration-300 ${
                        on ? "text-foreground" : i < active ? "text-body" : "text-muted"
                      }`}
                    >
                      {i + 1} · {s.short}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="flex gap-1.5 lg:hidden">
              {SCENES.map((s, i) => (
                <span key={s.key} className="relative h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <span className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${clamp01(pos - i) * 100}%` }} />
                </span>
              ))}
            </div>

            {/* fixed height so the layout doesn't jump between chapters with longer captions */}
            <div className="mt-5 min-h-[190px] sm:min-h-[210px] lg:mt-0 lg:min-h-[230px]">
            <div key={scene.key} className="animate-fade-in-down" style={{ animationDuration: "0.6s" }}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">Chapter {active + 1}</p>
              <h3 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[36px]">
                {scene.title}
              </h3>
              <p className="mt-3 max-w-md text-[16px] leading-relaxed text-body">{scene.body}</p>
            </div>
            </div>
          </div>

          {/* drawing */}
          <div className="order-1 mx-auto w-full max-w-[640px] lg:order-2">
            <Panel>
              {SCENES.map((s, i) => {
                const l = pos - i;
                const fadeIn = i === 0 ? 1 : seg(l, -0.04, 0.05);
                const fadeOut = i === N - 1 ? 1 : 1 - seg(l, 0.9, 0.99);
                const opacity = Math.min(fadeIn, fadeOut);
                if (opacity <= 0) return null;
                return (
                  <div
                    key={s.key}
                    className="absolute inset-0 p-3 sm:p-5"
                    style={{ opacity, transform: `scale(${0.97 + 0.03 * opacity})` }}
                  >
                    <SketchScene scene={s} draw={seg(l, 0.02, 0.72)} />
                  </div>
                );
              })}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
