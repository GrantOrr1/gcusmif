"use client";

import { useEffect, useRef, useState } from "react";
import BuffettPortrait from "./BuffettPortrait";
import Principles from "./Principles";

const HEADER_OFFSET = 80; // sticky site header height
const TRACK_VH = 150; // total scroll track; the stage is pinned for (TRACK_VH - 100)vh of it
// Timeline, as a share of the scroll from "section enters the bottom of the screen"
// to "pin releases". Drawing starts the moment the section appears.
const DRAW_END = 0.6; // portrait finishes drawing, full-screen
const SHRINK_START = 0.66; // short hold, then it shrinks into its slot
const SHRINK_END = 0.92;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Copy() {
  return (
    <>
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">Our philosophy</p>
      <h2 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-[40px]">
        We invest like Warren Buffett.
      </h2>
      <p className="mt-4 text-[16px] leading-relaxed text-body">
        Our Student Analysts follow the investment teachings Warren Buffett followed, a strategy called{" "}
        <span className="font-semibold text-foreground">Value Investing</span>. Here are the nine
        principles behind every position we take.
      </p>
    </>
  );
}

export default function Philosophy() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [pinnedAt, setPinnedAt] = useState(0.36);
  const [progress, setProgress] = useState(0);
  const [fly, setFly] = useState({ dx: 0, dy: 0, scale: 1 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const wrap = wrapRef.current;
      const slot = slotRef.current;
      const stage = stageRef.current;
      if (!wrap || !slot || !stage) return;
      const vh = window.innerHeight;
      const pinned = wrap.offsetHeight - vh; // scroll distance while pinned
      const range = vh + pinned; // plus the distance while the section scrolls into view
      const p = clamp01((vh - wrap.getBoundingClientRect().top) / Math.max(1, range));
      setProgress(p);
      setPinnedAt(vh / range);

      // How far/large the portrait must be to sit centered and fill the screen.
      // The slot itself is never transformed, so its rect is the final resting place.
      // Centered on the *stage* (not the viewport), so while the section is still
      // scrolling into view the big portrait rises up with it.
      const r = slot.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      const scale = Math.max(1, Math.min((st.height * 0.94) / r.height, (window.innerWidth * 0.94) / r.width));
      setFly({
        dx: window.innerWidth / 2 - (r.left + r.width / 2),
        dy: st.top + st.height / 2 - (r.top + r.height / 2),
        scale,
      });
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
      <>
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Copy />
          </div>
          <BuffettPortrait progress={1} />
        </div>
        <PrinciplesTitle />
        <div className="mt-8">
          <Principles />
        </div>
      </>
    );
  }

  const draw = clamp01(progress / DRAW_END);
  const shrink = easeInOut(clamp01((progress - SHRINK_START) / (SHRINK_END - SHRINK_START)));
  const away = 1 - shrink; // 1 = full-screen & centered, 0 = resting in its slot
  const portraitStyle = {
    transform: `translate3d(${fly.dx * away}px, ${fly.dy * away}px, 0) scale(${1 + (fly.scale - 1) * away})`,
    transformOrigin: "center center",
    willChange: "transform",
  } as const;
  const copyStyle = {
    opacity: shrink,
    transform: `translateY(${(1 - shrink) * 40}px)`,
  } as const;

  return (
    <>
      {/* Tall track: while scrolling through it, the stage stays pinned on screen. */}
      <div ref={wrapRef} className="relative" style={{ height: `${TRACK_VH}vh` }}>
        <div
          ref={stageRef}
          className="sticky flex items-center"
          style={{ top: HEADER_OFFSET, height: `calc(100vh - ${HEADER_OFFSET}px)` }}
        >
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div className="hidden lg:block" style={copyStyle}>
              <Copy />
            </div>
            <div ref={slotRef} className="mx-auto w-full max-w-[260px] sm:max-w-[340px] lg:max-w-[400px]">
              <div style={portraitStyle}>
                <BuffettPortrait progress={draw} />
              </div>
            </div>
          </div>

          {/* scroll hint while drawing */}
          <p
            className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-[12px] uppercase tracking-[0.2em] text-muted transition-opacity duration-500"
            style={{ opacity: progress > pinnedAt && progress < DRAW_END ? 1 : 0 }}
          >
            Keep scrolling
          </p>
        </div>
      </div>

      {/* on small screens the copy sits below the drawing instead of beside it */}
      <div className="lg:hidden">
        <Copy />
      </div>

      <PrinciplesTitle />
      <div className="mt-8">
        <Principles />
      </div>
    </>
  );
}

function PrinciplesTitle() {
  return (
    <h3 className="mt-12 text-balance text-[24px] font-bold tracking-tight text-foreground sm:text-[30px]">
      Principles taught indirectly from Warren Buffett
    </h3>
  );
}
