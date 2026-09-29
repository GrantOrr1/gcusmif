"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatPhoenixDateTime } from "@/lib/format";

type TradeSide = "buy" | "sell";

type TradeRecord = {
  id: number;
  ticker: string;
  side: TradeSide;
  quantity: number;
  price: number;
  tradedAt: string;
  enteredBy: string;
};

export default function TradeHistoryPanel({ ticker }: { ticker: string }) {
  const [trades, setTrades] = useState<TradeRecord[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/holdings/trades?ticker=${encodeURIComponent(ticker)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setTrades(json.trades ?? []);
      })
      .catch(() => {
        if (!cancelled) setTrades([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (trades === null) {
    return <p className="px-3 py-3 text-sm text-muted">Loading trade history…</p>;
  }

  if (trades.length === 0) {
    return (
      <p className="px-3 py-3 text-sm text-muted">
        No logged trades for {ticker} yet — this position is tracked from the spreadsheet.
      </p>
    );
  }

  return (
    <div className="px-3 py-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted">
            <th className="py-1 pr-3 text-left font-semibold uppercase tracking-wide">Date &amp; Time</th>
            <th className="py-1 pr-3 text-left font-semibold uppercase tracking-wide">Side</th>
            <th className="py-1 pr-3 text-right font-semibold uppercase tracking-wide">Shares</th>
            <th className="py-1 pr-3 text-right font-semibold uppercase tracking-wide">Price</th>
            <th className="py-1 pr-3 text-right font-semibold uppercase tracking-wide">Total</th>
            <th className="py-1 text-left font-semibold uppercase tracking-wide">Entered By</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-t border-border/60">
              <td className="py-1.5 pr-3 text-muted">{formatPhoenixDateTime(t.tradedAt)}</td>
              <td className={`py-1.5 pr-3 font-medium ${t.side === "buy" ? "text-positive" : "text-negative"}`}>
                {t.side === "buy" ? "Buy" : "Sell"}
              </td>
              <td className="py-1.5 pr-3 text-right text-foreground">{t.quantity.toLocaleString()}</td>
              <td className="py-1.5 pr-3 text-right text-foreground">{formatCurrency(t.price)}</td>
              <td className="py-1.5 pr-3 text-right text-foreground">{formatCurrency(t.quantity * t.price)}</td>
              <td className="py-1.5 text-muted">{t.enteredBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
