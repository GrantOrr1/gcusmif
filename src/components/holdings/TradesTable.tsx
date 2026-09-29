import Link from "next/link";
import { formatCurrency, formatPhoenixDateTime } from "@/lib/format";
import { sectorByLabel } from "@/lib/sectors";

type TradeSide = "buy" | "sell";

type TradeRecord = {
  id: number;
  ticker: string;
  companyName: string | null;
  sector: string;
  side: TradeSide;
  quantity: number;
  price: number;
  tradedAt: string;
};

export default function TradesTable({
  trades,
  title = "Trades",
}: {
  /** Newest first — pass trades already sorted by tradedAt descending. */
  trades: TradeRecord[];
  title?: string;
}) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        {title} <span className="text-muted">({trades.length})</span>
      </h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[840px] text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Date &amp; Time
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Ticker
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Company
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Sector
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Side
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                Shares
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                Price
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted">
                  No trades logged yet.
                </td>
              </tr>
            ) : (
              trades.map((t) => {
                const sectorSlug = sectorByLabel(t.sector)?.slug;
                return (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted">{formatPhoenixDateTime(t.tradedAt)}</td>
                    <td className="px-3 py-2 font-semibold">
                      <Link href={`/equity/${t.ticker}`} className="text-foreground hover:text-brand hover:underline">
                        {t.ticker}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {t.companyName ? (
                        <Link href={`/equity/${t.ticker}`} className="hover:text-brand hover:underline">
                          {t.companyName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {sectorSlug ? (
                        <Link href={`/port-test/${sectorSlug}`} className="hover:text-brand hover:underline">
                          {t.sector}
                        </Link>
                      ) : (
                        t.sector
                      )}
                    </td>
                    <td className={`px-3 py-2 font-medium ${t.side === "buy" ? "text-positive" : "text-negative"}`}>
                      {t.side === "buy" ? "Buy" : "Sell"}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{t.quantity.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-foreground">{formatCurrency(t.price)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{formatCurrency(t.quantity * t.price)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
