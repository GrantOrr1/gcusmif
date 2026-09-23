import { getPortfolioData } from "./portfolio";
import { getHistoricalCloses, type RangeKey } from "./yahoo";
import { PORTFOLIO_BENCHMARK, benchmarkForSector } from "./sectors";

export type { RangeKey };

export const RANGE_KEYS: RangeKey[] = ["1d", "5d", "1mo", "3mo", "6mo", "ytd", "1y", "3y"];

export type PerformancePoint = {
  date: string;
  portfolio: number;
  portfolioValue: number;
  sectors: Record<string, number>;
  sectorValues: Record<string, number>;
  holdings: Record<string, number>;
  holdingPrices: Record<string, number>;
  benchmark?: number;
  benchmarkValue?: number;
  sectorBenchmarks: Record<string, number>;
  sectorBenchmarkValues: Record<string, number>;
};

export type PerformanceSeries = {
  range: RangeKey;
  points: PerformancePoint[];
  sectors: string[];
  asOf: string;
};

const CACHE_TTL_MS = 20 * 60 * 1000;
const CONCURRENCY = 6;

const cache = new Map<RangeKey, { data: PerformanceSeries; fetchedAt: number }>();
const inFlight = new Map<RangeKey, Promise<PerformanceSeries>>();

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function fillForward(dates: string[], closes: { date: string; close: number | null }[]): Map<string, number> {
  const dateToClose = new Map(
    closes.filter((c) => c.close !== null).map((c) => [c.date, c.close as number])
  );
  const filled = new Map<string, number>();
  let last: number | null = null;
  for (const date of dates) {
    if (dateToClose.has(date)) last = dateToClose.get(date)!;
    if (last !== null) filled.set(date, last);
  }
  return filled;
}

async function computeSeries(range: RangeKey): Promise<PerformanceSeries> {
  const portfolio = await getPortfolioData();
  const holdings = portfolio.holdings.filter(
    (h) => h.ticker && h.quantity !== null && h.quantity > 0
  );

  const histories = await mapWithConcurrency(holdings, CONCURRENCY, async (h) => ({
    holding: h,
    closes: await getHistoricalCloses(h.ticker, range).catch(() => []),
  }));

  const valid = histories.filter((h) => h.closes.some((c) => c.close !== null));
  if (valid.length === 0) {
    return { range, points: [], sectors: [], asOf: new Date().toISOString() };
  }

  const backbone = valid.reduce((a, b) => (b.closes.length > a.closes.length ? b : a));
  const dates = backbone.closes.map((c) => c.date);

  const seriesByTicker = new Map<string, Map<string, number>>();
  for (const { holding, closes } of valid) {
    seriesByTicker.set(holding.ticker, fillForward(dates, closes));
  }

  const sectors = Array.from(
    new Set(valid.map((v) => v.holding.sector).filter((s): s is string => !!s))
  );

  const benchmarkTickers = Array.from(
    new Set([PORTFOLIO_BENCHMARK.ticker, ...sectors.map((s) => benchmarkForSector(s).ticker)])
  );
  const benchmarkHistories = await mapWithConcurrency(benchmarkTickers, CONCURRENCY, async (t) => ({
    ticker: t,
    closes: await getHistoricalCloses(t, range).catch(() => []),
  }));
  const benchmarkByTicker = new Map<string, Map<string, number>>();
  for (const { ticker, closes } of benchmarkHistories) {
    benchmarkByTicker.set(ticker, fillForward(dates, closes));
  }

  function valueAt(date: string, sectorFilter?: string): number | null {
    let total = 0;
    let any = false;
    for (const { holding } of valid) {
      if (sectorFilter && holding.sector !== sectorFilter) continue;
      const close = seriesByTicker.get(holding.ticker)?.get(date);
      if (close === undefined) continue;
      total += close * (holding.quantity ?? 0);
      any = true;
    }
    return any ? total : null;
  }

  const baseDate = dates.find((d) => valueAt(d) !== null);
  const baseTotal = baseDate ? valueAt(baseDate) : null;
  const baseBySector = new Map(
    sectors.map((s) => [s, baseDate ? valueAt(baseDate, s) : null])
  );
  const baseByTicker = new Map(
    valid.map(({ holding }) => [
      holding.ticker,
      baseDate ? (seriesByTicker.get(holding.ticker)?.get(baseDate) ?? null) : null,
    ])
  );
  const baseByBenchmark = new Map(
    benchmarkTickers.map((t) => [t, baseDate ? benchmarkByTicker.get(t)?.get(baseDate) : undefined])
  );

  const points: PerformancePoint[] = [];
  if (baseTotal) {
    for (const date of dates) {
      const total = valueAt(date);
      if (total === null) continue;
      const sectorReturns: Record<string, number> = {};
      const sectorValues: Record<string, number> = {};
      for (const s of sectors) {
        const base = baseBySector.get(s);
        const val = valueAt(date, s);
        if (base && val !== null) {
          sectorReturns[s] = val / base - 1;
          sectorValues[s] = val;
        }
      }
      const holdingReturns: Record<string, number> = {};
      const holdingPrices: Record<string, number> = {};
      for (const { holding } of valid) {
        const base = baseByTicker.get(holding.ticker);
        const close = seriesByTicker.get(holding.ticker)?.get(date);
        if (base && close !== undefined) {
          holdingReturns[holding.ticker] = close / base - 1;
          holdingPrices[holding.ticker] = close;
        }
      }

      const spBase = baseByBenchmark.get(PORTFOLIO_BENCHMARK.ticker);
      const spClose = benchmarkByTicker.get(PORTFOLIO_BENCHMARK.ticker)?.get(date);
      const benchmark = spBase !== undefined && spClose !== undefined ? spClose / spBase - 1 : undefined;
      const benchmarkValue = benchmark !== undefined ? baseTotal * (1 + benchmark) : undefined;

      const sectorBenchmarks: Record<string, number> = {};
      const sectorBenchmarkValues: Record<string, number> = {};
      for (const s of sectors) {
        const ticker = benchmarkForSector(s).ticker;
        const base = baseByBenchmark.get(ticker);
        const close = benchmarkByTicker.get(ticker)?.get(date);
        const sectorBase = baseBySector.get(s);
        if (base !== undefined && close !== undefined) {
          const sectorBenchmarkReturn = close / base - 1;
          sectorBenchmarks[s] = sectorBenchmarkReturn;
          if (sectorBase) sectorBenchmarkValues[s] = sectorBase * (1 + sectorBenchmarkReturn);
        }
      }

      points.push({
        date,
        portfolio: total / baseTotal - 1,
        portfolioValue: total,
        sectors: sectorReturns,
        sectorValues,
        holdings: holdingReturns,
        holdingPrices,
        benchmark,
        benchmarkValue,
        sectorBenchmarks,
        sectorBenchmarkValues,
      });
    }
  }

  return { range, points, sectors, asOf: new Date().toISOString() };
}

export async function getPortfolioPerformance(range: RangeKey): Promise<PerformanceSeries> {
  const cached = cache.get(range);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }
  const existing = inFlight.get(range);
  if (existing) return existing;

  const promise = computeSeries(range)
    .then((data) => {
      cache.set(range, { data, fetchedAt: Date.now() });
      return data;
    })
    .catch((err) => {
      const stale = cache.get(range);
      if (stale) {
        console.error(`Performance refresh failed for ${range}, serving stale cache:`, err);
        return stale.data;
      }
      throw err;
    })
    .finally(() => {
      inFlight.delete(range);
    });

  inFlight.set(range, promise);
  return promise;
}

type ReturnKey = "portfolio" | { sector: string } | { ticker: string };

function valueForKey(point: PerformancePoint, key: ReturnKey): number | undefined {
  if (key === "portfolio") return point.portfolio;
  if ("sector" in key) return point.sectors[key.sector];
  return point.holdings[key.ticker];
}

/** First 10 chars of either a "YYYY-MM-DD" date or a full ISO timestamp — the calendar day. */
function dayKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

export function dailyReturnFor(
  series: PerformanceSeries,
  key: ReturnKey = "portfolio"
): number | null {
  const { points } = series;
  if (points.length < 2) return null;

  // Reduce to one (the last) value per calendar day — works whether points
  // are daily bars already, or intraday bars (e.g. "5d" is hourly).
  const lastByDay = new Map<string, number>();
  for (const p of points) {
    const v = valueForKey(p, key);
    if (v !== undefined) lastByDay.set(dayKey(p.date), v);
  }
  const days = Array.from(lastByDay.keys());
  if (days.length < 2) return 0;

  // Non-trading days (e.g. weekends) sometimes carry the prior close forward,
  // producing an exact 0% "change" — walk back to the last real move instead.
  for (let i = days.length - 1; i >= 1; i--) {
    const curr = lastByDay.get(days[i])!;
    const prev = lastByDay.get(days[i - 1])!;
    const ret = (1 + curr) / (1 + prev) - 1;
    if (ret !== 0) return ret;
  }
  return 0;
}

export function weeklyReturnFor(
  series: PerformanceSeries,
  key: ReturnKey = "portfolio"
): number | null {
  const { points } = series;
  if (points.length === 0) return null;
  return valueForKey(points[points.length - 1], key) ?? null;
}

export function dailyReturnFromSeries(series: PerformanceSeries): number | null {
  return dailyReturnFor(series, "portfolio");
}

export function weeklyReturnFromSeries(series: PerformanceSeries): number | null {
  return weeklyReturnFor(series, "portfolio");
}

export type TickerPerformancePoint = { date: string; value: number; price: number };
export type TickerPerformanceSeries = { range: RangeKey; points: TickerPerformancePoint[] };

/**
 * Percent price return since the start of the selected range, for any ticker —
 * unlike getPortfolioPerformance this isn't limited to current fund holdings.
 */
export async function getTickerPerformance(
  ticker: string,
  range: RangeKey
): Promise<TickerPerformanceSeries> {
  const closes = await getHistoricalCloses(ticker, range).catch(() => []);
  const valid: { date: string; close: number }[] = [];
  for (const c of closes) {
    if (c.close !== null) valid.push({ date: c.date, close: c.close });
  }
  if (valid.length === 0) return { range, points: [] };

  const base = valid[0].close;
  const points = valid.map((c) => ({ date: c.date, value: c.close / base - 1, price: c.close }));
  return { range, points };
}
