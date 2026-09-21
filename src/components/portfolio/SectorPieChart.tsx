"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colorForSector } from "@/lib/sectorColors";
import { sectorByCode } from "@/lib/sectors";
import { formatPercent } from "@/lib/format";

type Slice = { sector: string; value: number };

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: Number((cx + r * Math.cos(angleRad)).toFixed(3)),
    y: Number((cy + r * Math.sin(angleRad)).toFixed(3)),
  };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function computeSlices(filtered: Slice[], total: number) {
  const result: (Slice & { startAngle: number; endAngle: number })[] = [];
  let cumulative = 0;
  for (const d of filtered) {
    const fraction = d.value / total;
    const startAngle = cumulative * 360;
    cumulative += fraction;
    result.push({ ...d, startAngle, endAngle: cumulative * 360 });
  }
  return result;
}

export default function SectorPieChart({ data }: { data: Slice[] }) {
  const router = useRouter();
  const [hovered, setHovered] = useState<{ sector: string; value: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((sum, d) => sum + d.value, 0) || 1;
  const size = 200;
  const r = size / 2;

  const slices = computeSlices(filtered, total);

  function handleMouseMove(e: React.MouseEvent<SVGElement>) {
    const container = e.currentTarget.closest(".pie-chart-wrapper") as HTMLElement | null;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function goToSector(sector: string) {
    const info = sectorByCode(sector);
    if (info) router.push(`/portfolio/${info.slug}`);
  }

  return (
    <div className="pie-chart-wrapper relative flex w-full flex-col items-center gap-6 sm:flex-row sm:items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-44 shrink-0">
        {slices.length === 1 ? (
          <circle
            cx={r}
            cy={r}
            r={r}
            fill={colorForSector(slices[0].sector)}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHovered(slices[0])}
            onMouseLeave={() => setHovered(null)}
            onClick={() => goToSector(slices[0].sector)}
            className={sectorByCode(slices[0].sector) ? "cursor-pointer" : undefined}
          />
        ) : (
          slices.map((s) => (
            <path
              key={s.sector}
              d={arcPath(r, r, r, s.startAngle, s.endAngle)}
              fill={colorForSector(s.sector)}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => goToSector(s.sector)}
              className={`transition-opacity hover:opacity-80 ${
                sectorByCode(s.sector) ? "cursor-pointer" : ""
              }`}
            />
          ))
        )}
      </svg>
      <ul className="w-full space-y-2">
        {slices.map((s) => (
          <li
            key={s.sector}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => goToSector(s.sector)}
            className={`flex items-center justify-between text-sm ${
              sectorByCode(s.sector) ? "cursor-pointer hover:opacity-80" : "cursor-default"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colorForSector(s.sector) }}
              />
              <span className="text-muted">{s.sector}</span>
            </span>
            <span className="font-medium text-foreground">{formatPercent(s.value, 1)}</span>
          </li>
        ))}
      </ul>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="font-semibold text-foreground">{hovered.sector}</p>
          <p className="text-muted">{formatPercent(hovered.value, 1)} of portfolio</p>
        </div>
      )}
    </div>
  );
}
