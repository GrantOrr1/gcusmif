"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Returns a ref and whether the element has scrolled into view (latches true once seen). */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

/** Fades + lifts its children into place when scrolled into view. */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.15);
  const style: CSSProperties = { transitionDelay: `${delay}ms` };
  return (
    <div
      ref={ref}
      data-shown={inView ? "" : undefined}
      className={`reveal ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
