import { getCoverageForTicker } from "./coverageStore";
import { listWatchlist } from "./watchlistStore";
import type { CalendarEvent } from "./calendarStore";

/** Everyone currently covering a ticker, via Coverage assignment or Watchlist assignment. */
export function getCoveringPeopleForTicker(ticker: string): string[] {
  const names = new Set<string>();
  const coverage = getCoverageForTicker(ticker);
  coverage?.assignedTo.forEach((n) => names.add(n));
  for (const item of listWatchlist()) {
    if (item.ticker === ticker) item.assignedTo.forEach((n) => names.add(n));
  }
  return Array.from(names);
}

export function withCoverage(event: CalendarEvent): CalendarEvent & { coveringNames: string[] } {
  return {
    ...event,
    coveringNames: event.ticker ? getCoveringPeopleForTicker(event.ticker) : [],
  };
}

/** Tickers eligible for an earnings-call event: anything watched or held. */
export async function listEarningsEligibleTickers(): Promise<
  { ticker: string; companyName: string | null }[]
> {
  const { getPortfolioData } = await import("./portfolio");
  const portfolio = await getPortfolioData();
  const map = new Map<string, string | null>();
  for (const h of portfolio.holdings) map.set(h.ticker, h.companyName);
  for (const w of listWatchlist()) if (!map.has(w.ticker)) map.set(w.ticker, w.companyName);
  return Array.from(map.entries())
    .map(([ticker, companyName]) => ({ ticker, companyName }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}
