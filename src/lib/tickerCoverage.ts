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
