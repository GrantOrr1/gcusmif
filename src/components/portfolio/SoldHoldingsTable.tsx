"use client";

import { useRouter } from "next/navigation";
import type { SoldHolding } from "@/lib/portfolio";
import { formatPercent, formatPrice, formatCurrency, formatNumber } from "@/lib/format";

const COLUMNS = [
  "Ticker",
  "Company",
  "Sector",
  "Price Paid",
  "Sale Price",
  "% Change",
  "Qty Sold",
  "Cost Basis",
  "Proceeds",
  "Realized Gain",
];

export default function SoldHoldingsTable({ soldHoldings }: { soldHoldings: SoldHolding[] }) {
  const router = useRouter();

  if (soldHoldings.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Sold Holdings <span className="text-muted">({soldHoldings.length})</span>
      </h2>
      <p className="mb-3 text-xs text-muted">
        Positions sold during the year. Realized gains from these trades are folded into the YTD
        Return and Return Incl. Realized figures above.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1040px] text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {COLUMNS.map((label, i) => (
                <th
                  key={label}
                  className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted ${
                    i === 0 || i === 1 || i === 2 ? "text-left" : "text-right"
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {soldHoldings.map((h) => (
              <tr
                key={h.ticker}
                onClick={() => router.push(`/equity/${h.ticker}`)}
                className="group cursor-pointer border-b border-border last:border-0 hover:bg-background"
              >
                <td className="px-3 py-2 font-semibold text-foreground group-hover:text-brand group-hover:underline">
                  {h.ticker}
                </td>
                <td className="px-3 py-2 text-muted group-hover:text-foreground">
                  {h.companyName ?? "—"}
                </td>
                <td className="px-3 py-2 text-muted">{h.sector ?? "—"}</td>
                <td className="px-3 py-2 text-right text-foreground group-hover:text-brand">
                  {formatPrice(h.pricePaid)}
                </td>
                <td className="px-3 py-2 text-right text-foreground group-hover:text-brand">
                  {formatPrice(h.salePrice)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium group-hover:text-brand ${
                    h.percentChange === null
                      ? "text-muted"
                      : h.percentChange >= 0
                        ? "text-positive"
                        : "text-negative"
                  }`}
                >
                  {formatPercent(h.percentChange)}
                </td>
                <td className="px-3 py-2 text-right text-foreground group-hover:text-brand">
                  {formatNumber(h.quantitySold)}
                </td>
                <td className="px-3 py-2 text-right text-foreground group-hover:text-brand">
                  {formatCurrency(h.costBasis)}
                </td>
                <td className="px-3 py-2 text-right text-foreground group-hover:text-brand">
                  {formatCurrency(h.proceeds)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium group-hover:text-brand ${
                    h.realizedGain === null
                      ? "text-muted"
                      : h.realizedGain >= 0
                        ? "text-positive"
                        : "text-negative"
                  }`}
                >
                  {formatCurrency(h.realizedGain)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
