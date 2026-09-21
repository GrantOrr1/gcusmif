"use client";

import { useMemo, useState } from "react";
import type { Quote } from "@/lib/yahoo";
import { formatCurrency, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import PriceChart from "./PriceChart";

type HeldEquity = { ticker: string; companyName: string | null };

export default function EquityResearch({ holdings }: { holdings: HeldEquity[] }) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return holdings
      .filter(
        (h) =>
          h.ticker.toLowerCase().includes(q) ||
          (h.companyName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, holdings]);

  function handleQueryChange(value: string) {
    setQuery(value);
    setShowSuggestions(true);
  }

  async function loadQuote(symbol: string) {
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    setQuery(symbol);
    try {
      const res = await fetch(`/api/analyst/quote?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) {
        setError("Could not find that symbol.");
        setQuote(null);
        return;
      }
      const json = (await res.json()) as Quote;
      setQuote(json);
    } catch {
      setError("Something went wrong fetching that quote.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="relative max-w-md">
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length > 0) loadQuote(suggestions[0].ticker);
          }}
          placeholder="Search current holdings by ticker or company"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-brand"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
            {suggestions.map((s) => (
              <li key={s.ticker}>
                <button
                  onClick={() => loadQuote(s.ticker)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background"
                >
                  <span className="font-medium text-foreground">{s.ticker}</span>
                  <span className="truncate pl-2 text-muted">{s.companyName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {error && <p className="mt-6 text-sm text-negative">{error}</p>}

      {quote && !loading && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-foreground">{quote.symbol}</h2>
              <p className="text-sm text-muted">
                {quote.longName ?? quote.shortName} · {quote.exchangeName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                {formatPrice(quote.regularMarketPrice)}
              </p>
              <p
                className={`text-sm font-medium ${
                  (quote.change ?? 0) >= 0 ? "text-positive" : "text-negative"
                }`}
              >
                {quote.change !== null ? formatPrice(quote.change) : "—"} (
                {formatPercent(quote.changePercent)})
              </p>
            </div>
          </div>

          <div className="mt-6">
            <PriceChart history={quote.history} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Day Range" value={`${formatPrice(quote.dayLow)} – ${formatPrice(quote.dayHigh)}`} />
            <Stat
              label="52-Week Range"
              value={`${formatPrice(quote.fiftyTwoWeekLow)} – ${formatPrice(quote.fiftyTwoWeekHigh)}`}
            />
            <Stat label="Market Cap" value={formatCurrency(quote.marketCap)} />
            <Stat label="Volume" value={formatNumber(quote.volume)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
