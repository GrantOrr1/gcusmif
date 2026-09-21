"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/format";

const ANIMATION_MS = 750;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function StatBox({
  label,
  value,
  kind,
  tone = "neutral",
}: {
  label: string;
  value: number | null;
  kind: "currency" | "percent";
  tone?: "neutral" | "positive" | "negative";
}) {
  const [display, setDisplay] = useState<number | null>(value === null ? null : 0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) return;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min((now - start) / ANIMATION_MS, 1);
      setDisplay(value! * easeOutCubic(t));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value]);

  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  const formatted =
    display === null ? "—" : kind === "currency" ? formatCurrency(display) : formatPercent(display);

  return (
    <Link
      href="/portfolio"
      className="rounded-lg border border-border bg-surface p-6 text-center transition-colors hover:border-brand hover:bg-background"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{formatted}</p>
    </Link>
  );
}
