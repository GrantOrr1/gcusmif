import { getHistoricalCloses, type RangeKey } from "./yahoo";
import { PORTFOLIO_BENCHMARK, benchmarkForSector } from "./sectors";
import { listAllTrades, type TradeRecord } from "./tradeLedger";
import type { PerformancePoint, PerformanceSeries } from "./performance";

const CONCURRENCY = 6;

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
  const dateToClose = new Map(closes.filter((c) => c.close !== null).map((c) => [c.date, c.close as number]));
  const filled = new Map<string, number>();
  let last: number | null = null;
  for (const date of dates) {
    if (dateToClose.has(date)) last = dateToClose.get(date)!;
    if (last !== null) filled.set(date, last);
  }
  return filled;
}

/** Net shares held on each date in `dates`, from a ticker's own trades sorted ascending. */
function quantitySeries(dates: string[], trades: TradeRecord[]): Map<string, number> {
  const sorted = [...trades].sort((a, b) => a.tradedAt.localeCompare(b.tradedAt));
  const out = new Map<string, number>();
  let quantity = 0;
  let i = 0;
  for (const date of dates) {
    while (i < sorted.length && sorted[i].tradedAt.slice(0, 10) <= date) {
      quantity += sorted[i].side === "buy" ? sorted[i].quantity : -sorted[i].quantity;
      i++;
    }
    out.set(date, quantity);
  }
  return out;
}

/**
 * Same shape as getPortfolioPerformance() from performance.ts, but computed
 * from Adjust Holding Positions trades with time-varying share counts
 * instead of assuming today's holdings were held for the whole period.
 */
export async function getLedgerPortfolioPerformance(range: RangeKey): Promise<PerformanceSeries> {
  const trades = listAllTrades();
  if (trades.length === 0) {
    return { range, points: [], sectors: [], asOf: new Date().toISOString() };
  }

  const byTicker = new Map<string, TradeRecord[]>();
  for (const t of trades) {
    const arr = byTicker.get(t.ticker) ?? [];
    arr.push(t);
    byTicker.set(t.ticker, arr);
  }
  const tickers = Array.from(byTicker.keys());
  const sectorByTicker = new Map(tickers.map((t) => [t, byTicker.get(t)![0].sector]));

  const histories = await mapWithConcurrency(tickers, CONCURRENCY, async (ticker) => ({
    ticker,
    closes: await getHistoricalCloses(ticker, range).catch(() => []),
  }));

  const valid = histories.filter((h) => h.closes.some((c) => c.close !== null));
  if (valid.length === 0) {
    return { range, points: [], sectors: [], asOf: new Date().toISOString() };
  }

  const backbone = valid.reduce((a, b) => (b.closes.length > a.closes.length ? b : a));
  const dates = backbone.closes.map((c) => c.date);

  const seriesByTicker = new Map<string, Map<string, number>>();
  for (const { ticker, closes } of valid) {
    seriesByTicker.set(ticker, fillForward(dates, closes));
  }

  const quantityByTicker = new Map<string, Map<string, number>>();
  for (const ticker of tickers) {
    quantityByTicker.set(ticker, quantitySeries(dates, byTicker.get(ticker) ?? []));
  }

  const sectors = Array.from(
    new Set(tickers.map((t) => sectorByTicker.get(t)).filter((s): s is string => !!s))
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
    for (const ticker of tickers) {
      if (sectorFilter && sectorByTicker.get(ticker) !== sectorFilter) continue;
      const quantity = quantityByTicker.get(ticker)?.get(date) ?? 0;
      if (quantity <= 0) continue;
      const close = seriesByTicker.get(ticker)?.get(date);
      if (close === undefined) continue;
      total += close * quantity;
      any = true;
    }
    return any ? total : null;
  }

  const baseDate = dates.find((d) => valueAt(d) !== null);
  const baseTotal = baseDate ? valueAt(baseDate) : null;
  const baseBySector = new Map(sectors.map((s) => [s, baseDate ? valueAt(baseDate, s) : null]));
  const baseByTicker = new Map(
    tickers.map((ticker) => {
      const qty0 = baseDate ? (quantityByTicker.get(ticker)?.get(baseDate) ?? 0) : 0;
      const close0 = baseDate ? seriesByTicker.get(ticker)?.get(baseDate) : undefined;
      return [ticker, qty0 > 0 && close0 !== undefined ? close0 : null];
    })
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
      for (const ticker of tickers) {
        const base = baseByTicker.get(ticker);
        const close = seriesByTicker.get(ticker)?.get(date);
        if (base && close !== undefined) {
          holdingReturns[ticker] = close / base - 1;
          holdingPrices[ticker] = close;
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
