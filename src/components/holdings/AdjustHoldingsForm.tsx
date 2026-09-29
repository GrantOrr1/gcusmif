"use client";

import { useEffect, useRef, useState } from "react";
import { SECTOR_INFO } from "@/lib/sectors";
import { formatCurrency, formatPhoenixDateTime } from "@/lib/format";

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
  enteredBy: string;
  createdAt: string;
};

type SymbolSearchResult = { symbol: string; name: string; exchange: string; type: string };

function nowForDateTimeInput(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function AdjustHoldingsForm() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);

  const [tickerQuery, setTickerQuery] = useState("");
  const [tickerResults, setTickerResults] = useState<SymbolSearchResult[]>([]);
  const [tickerSearchOpen, setTickerSearchOpen] = useState(false);
  const [selected, setSelected] = useState<{ symbol: string; name: string } | null>(null);
  const tickerSearchRef = useRef<HTMLDivElement>(null);

  const [sector, setSector] = useState(SECTOR_INFO[0].label);
  const [side, setSide] = useState<TradeSide>("buy");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [tradedAt, setTradedAt] = useState(nowForDateTimeInput());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TradeRecord | null>(null);

  useEffect(() => {
    fetch("/api/holdings/trades")
      .then((res) => res.json())
      .then((json) => setTrades(json.trades ?? []))
      .catch(() => setTrades([]))
      .finally(() => setLoadingTrades(false));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (tickerSearchRef.current && !tickerSearchRef.current.contains(e.target as Node)) {
        setTickerSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!tickerQuery.trim()) return;
    const t = setTimeout(() => {
      fetch(`/api/analyst/search?q=${encodeURIComponent(tickerQuery)}`)
        .then((res) => res.json())
        .then((json) => setTickerResults(json.results ?? []))
        .catch(() => setTickerResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [tickerQuery]);

  function pickTicker(r: SymbolSearchResult) {
    setSelected({ symbol: r.symbol, name: r.name });
    setTickerQuery(`${r.symbol} — ${r.name}`);
    setTickerResults([]);
    setTickerSearchOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError("Search for and select a ticker first.");
      return;
    }
    const qty = Number(quantity);
    const px = Number(price);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a valid number of shares.");
      return;
    }
    if (!Number.isFinite(px) || px <= 0) {
      setError("Enter a valid price per share.");
      return;
    }
    if (!tradedAt) {
      setError("Enter a trade date and time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/holdings/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: selected.symbol,
          companyName: selected.name,
          sector,
          side,
          quantity: qty,
          price: px,
          tradedAt: new Date(tradedAt).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not log trade.");
        return;
      }
      setTrades((prev) => [json.trade, ...prev]);
      setSelected(null);
      setTickerQuery("");
      setQuantity("");
      setPrice("");
      setTradedAt(nowForDateTimeInput());
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    setTrades((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/holdings/trades/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div>
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div ref={tickerSearchRef} className="relative">
          <label className="mb-1 block text-xs font-medium text-muted">Ticker or company</label>
          <input
            type="text"
            value={tickerQuery}
            onChange={(e) => {
              const next = e.target.value;
              setTickerQuery(next);
              setSelected(null);
              setTickerSearchOpen(true);
              if (!next.trim()) setTickerResults([]);
            }}
            onFocus={() => setTickerSearchOpen(true)}
            placeholder="Search…"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
          {tickerSearchOpen && tickerResults.length > 0 && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
              {tickerResults.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => pickTicker(r)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-border/40"
                >
                  <span className="truncate text-foreground">{r.name}</span>
                  <span className="shrink-0 text-xs text-muted">{r.symbol}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Sector</label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          >
            {SECTOR_INFO.filter((s) => s.code !== "AGN").map((s) => (
              <option key={s.code} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Side</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSide("buy")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                side === "buy"
                  ? "border-positive bg-positive text-white"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide("sell")}
              className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                side === "sell"
                  ? "border-negative bg-negative text-white"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Shares</label>
          <input
            type="number"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Price per share</label>
          <input
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Trade date &amp; time</label>
          <input
            type="datetime-local"
            value={tradedAt}
            onChange={(e) => setTradedAt(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
          />
        </div>

        <div className="flex items-end sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {submitting ? "Logging…" : "Log Trade"}
          </button>
          {error && <p className="ml-4 text-sm text-negative">{error}</p>}
        </div>
      </form>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Logged Trades</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Date &amp; Time
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Ticker
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
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Entered By
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loadingTrades ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : trades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted">
                    No trades logged yet.
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted">{formatPhoenixDateTime(t.tradedAt)}</td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {t.ticker}
                      <span className="ml-1 font-normal text-muted">{t.companyName}</span>
                    </td>
                    <td className="px-3 py-2 text-muted">{t.sector}</td>
                    <td
                      className={`px-3 py-2 font-medium ${t.side === "buy" ? "text-positive" : "text-negative"}`}
                    >
                      {t.side === "buy" ? "Buy" : "Sell"}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">{t.quantity.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-foreground">{formatCurrency(t.price)}</td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatCurrency(t.quantity * t.price)}
                    </td>
                    <td className="px-3 py-2 text-muted">{t.enteredBy}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setPendingDelete(t)}
                        aria-label="Remove trade"
                        className="text-muted hover:text-negative"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">
              Are you sure you want to delete this trade?
            </h2>
            <p className="mt-2 text-sm text-muted">
              Deleting trades should only be done if the trade did not actually occur.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background"
              >
                Keep Trade
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md border border-negative px-4 py-2 text-sm font-semibold text-negative hover:bg-negative/10"
              >
                Delete Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
