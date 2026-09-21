import Link from "next/link";
import { formatPercent, formatPrice } from "@/lib/format";

type Mover = {
  ticker: string;
  companyName: string | null;
  weeklyReturn: number;
  priceChange: number | null;
};

export default function TopMovers({ movers }: { movers: Mover[] }) {
  if (movers.length === 0) {
    return <p className="text-sm text-muted">No weekly data available.</p>;
  }

  return (
    <div className="space-y-2">
      {movers.map((m) => {
        const up = m.weeklyReturn >= 0;
        return (
          <Link
            key={m.ticker}
            href={`/equity/${m.ticker}`}
            className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 hover:border-brand"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{m.ticker}</p>
              {m.companyName && (
                <p className="truncate text-xs text-muted">{m.companyName}</p>
              )}
            </div>
            <span
              className={`flex shrink-0 flex-col items-end text-sm font-semibold ${
                up ? "text-positive" : "text-negative"
              }`}
            >
              <span>
                {up ? "▲" : "▼"} {formatPercent(m.weeklyReturn)}
              </span>
              {m.priceChange !== null && (
                <span className="text-xs font-normal">
                  {up ? "+" : "−"}
                  {formatPrice(Math.abs(m.priceChange))}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
