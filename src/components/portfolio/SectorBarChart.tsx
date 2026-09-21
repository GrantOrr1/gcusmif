"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { colorForSector } from "@/lib/sectorColors";
import { sectorByCode } from "@/lib/sectors";
import { formatPercent } from "@/lib/format";

const WIDTH = 280;
const HEIGHT = 190;
const PADDING = { top: 22, right: 6, bottom: 20, left: 6 };

export default function SectorBarChart({
  data,
}: {
  data: { sector: string; value: number }[];
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState<{ sector: string; value: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const max = Math.max(...data.map((d) => d.value), 0);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = max - min || 1;
  const zeroY = PADDING.top + (max / range) * plotHeight;

  const slotWidth = plotWidth / data.length;
  const barWidth = Math.min(slotWidth * 0.55, 28);

  function handleMouseMove(e: React.MouseEvent<SVGElement>) {
    const container = e.currentTarget.closest(".bar-chart-wrapper") as HTMLElement | null;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className="bar-chart-wrapper relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        <line
          x1={PADDING.left}
          x2={WIDTH - PADDING.right}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--border)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const info = sectorByCode(d.sector);
          const x = PADDING.left + i * slotWidth + (slotWidth - barWidth) / 2;
          const barHeight = (Math.abs(d.value) / range) * plotHeight;
          const y = d.value >= 0 ? zeroY - barHeight : zeroY;
          const labelY = d.value >= 0 ? y - 4 : y + barHeight + 12;

          return (
            <g
              key={d.sector}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => info && router.push(`/portfolio/${info.slug}`)}
              className={info ? "cursor-pointer" : undefined}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx={2}
                fill={colorForSector(d.sector)}
                className="transition-opacity hover:opacity-80"
              />
              <text
                x={x + barWidth / 2}
                y={labelY}
                fontSize={9}
                textAnchor="middle"
                fill="var(--foreground)"
                fontWeight={600}
              >
                {formatPercent(d.value, 0)}
              </text>
              <text
                x={x + barWidth / 2}
                y={HEIGHT - 6}
                fontSize={9}
                textAnchor="middle"
                fill="var(--muted)"
              >
                {d.sector}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
        >
          <p className="font-semibold text-foreground">{hovered.sector}</p>
          <p className="text-muted">{formatPercent(hovered.value, 1)}</p>
        </div>
      )}
    </div>
  );
}
