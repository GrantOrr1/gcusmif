"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Holding } from "@/lib/portfolio";
import { formatPercent, formatPrice, formatCurrency } from "@/lib/format";

type Row = Holding & {
  ytdReturn: number | null;
  gainDollars: number | null;
  weight: number | null;
};

type SortKey = keyof Pick<
  Row,
  | "ticker"
  | "companyName"
  | "sector"
  | "pricePaid"
  | "currentPrice"
  | "ytdReturn"
  | "percentChange"
  | "gainDollars"
  | "totalValue"
  | "weight"
>;

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "ticker", label: "Ticker" },
  { key: "companyName", label: "Company" },
  { key: "sector", label: "Sector" },
  { key: "pricePaid", label: "Avg. Cost", align: "right" },
  { key: "currentPrice", label: "Price", align: "right" },
  { key: "ytdReturn", label: "YTD", align: "right" },
  { key: "percentChange", label: "Total", align: "right" },
  { key: "gainDollars", label: "Gain ($)", align: "right" },
  { key: "totalValue", label: "Value ($)", align: "right" },
  { key: "weight", label: "Weight", align: "right" },
];

export default function HoldingsTable({
  holdings,
  title = "Holdings",
  ytdReturns = {},
  portfolioTotalValue = null,
}: {
  holdings: Holding[];
  title?: string;
  ytdReturns?: Record<string, number>;
  portfolioTotalValue?: number | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalValue");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const rows: Row[] = useMemo(
    () =>
      holdings.map((h) => ({
        ...h,
        ytdReturn: ytdReturns[h.ticker] ?? null,
        gainDollars:
          h.totalValue !== null && h.totalValuePaid !== null
            ? h.totalValue - h.totalValuePaid
            : null,
        weight:
          portfolioTotalValue && h.totalValue !== null ? h.totalValue / portfolioTotalValue : null,
      })),
    [holdings, ytdReturns, portfolioTotalValue]
  );

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (h) =>
            h.ticker.toLowerCase().includes(q) ||
            (h.companyName ?? "").toLowerCase().includes(q)
        )
      : rows;

    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * sortDir;
      }
      return ((av as number) - (bv as number)) * sortDir;
    });
    return copy;
  }, [rows, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {title} <span className="text-muted">({holdings.length})</span>
        </h2>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or company…"
          className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand sm:w-64"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1040px] text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted hover:text-foreground ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((h) => {
              return (
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
                    {formatPrice(h.currentPrice)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium group-hover:text-brand ${
                      h.ytdReturn === null
                        ? "text-muted"
                        : h.ytdReturn >= 0
                          ? "text-positive"
                          : "text-negative"
                    }`}
                  >
                    {formatPercent(h.ytdReturn)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium group-hover:text-brand ${
                      (h.percentChange ?? 0) >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {formatPercent(h.percentChange)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-medium group-hover:text-brand ${
                      h.gainDollars === null
                        ? "text-muted"
                        : h.gainDollars >= 0
                          ? "text-positive"
                          : "text-negative"
                    }`}
                  >
                    {formatCurrency(h.gainDollars)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground group-hover:text-brand">
                    {formatCurrency(h.totalValue)}
                  </td>
                  <td className="px-3 py-2 text-right text-foreground group-hover:text-brand">
                    {formatPercent(h.weight)}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-muted">
                  {query.trim()
                    ? "No holdings match your search."
                    : "No holdings found. Check the portfolio spreadsheet formatting."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
