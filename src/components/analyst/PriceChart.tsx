import type { QuotePoint } from "@/lib/yahoo";

export default function PriceChart({ history }: { history: QuotePoint[] }) {
  const points = history.filter((p) => p.close !== null) as {
    date: string;
    close: number;
  }[];
  if (points.length < 2) {
    return <p className="text-sm text-muted">Not enough data for a chart.</p>;
  }

  const width = 600;
  const height = 160;
  const padding = 8;

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const path = points
    .map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - padding * 2);
      const y =
        height - padding - ((p.close - min) / range) * (height - padding * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const rising = points[points.length - 1].close >= points[0].close;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="1 year price history"
    >
      <path
        d={path}
        fill="none"
        stroke={rising ? "var(--positive)" : "var(--negative)"}
        strokeWidth={2}
      />
    </svg>
  );
}
