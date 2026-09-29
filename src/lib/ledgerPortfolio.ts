import { getQuote } from "./yahoo";
import { listAllTrades, type TradeRecord } from "./tradeLedger";
import type { Holding, PortfolioData, PortfolioSummary, SectorAllocation, SoldHolding } from "./portfolio";

type Lot = { quantity: number; price: number };

/**
 * FIFO-matches each ticker's buy/sell trades into remaining open lots and
 * aggregated realized sales, so holdings and sold positions can be derived
 * purely from the trade ledger instead of the spreadsheet.
 */
function computePositions(trades: TradeRecord[]) {
  const byTicker = new Map<string, TradeRecord[]>();
  for (const t of trades) {
    const arr = byTicker.get(t.ticker) ?? [];
    arr.push(t);
    byTicker.set(t.ticker, arr);
  }

  const openLots = new Map<string, Lot[]>();
  const soldAgg = new Map<string, { quantitySold: number; costBasis: number; proceeds: number }>();
  const meta = new Map<string, { companyName: string | null; sector: string }>();

  for (const [ticker, list] of byTicker) {
    const sorted = [...list].sort((a, b) => a.tradedAt.localeCompare(b.tradedAt));
    meta.set(ticker, { companyName: sorted[0].companyName, sector: sorted[0].sector });

    const lots: Lot[] = [];
    const agg = { quantitySold: 0, costBasis: 0, proceeds: 0 };

    for (const trade of sorted) {
      if (trade.side === "buy") {
        lots.push({ quantity: trade.quantity, price: trade.price });
        continue;
      }
      let remaining = trade.quantity;
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const consumed = Math.min(lot.quantity, remaining);
        agg.quantitySold += consumed;
        agg.costBasis += consumed * lot.price;
        agg.proceeds += consumed * trade.price;
        lot.quantity -= consumed;
        remaining -= consumed;
        if (lot.quantity <= 0) lots.shift();
      }
      // A sell exceeding logged buys (bad manual entry) just stops consuming —
      // this is an informational preview tool, not an accounting system.
    }

    openLots.set(ticker, lots);
    if (agg.quantitySold > 0) soldAgg.set(ticker, agg);
  }

  return { openLots, soldAgg, meta };
}

/** Same shape as getPortfolioData(), computed entirely from Adjust Holding Positions trades. */
export async function getLedgerPortfolioData(): Promise<PortfolioData> {
  const trades = listAllTrades();
  const { openLots, soldAgg, meta } = computePositions(trades);

  const tickers = Array.from(openLots.keys()).filter(
    (t) => (openLots.get(t) ?? []).reduce((sum, lot) => sum + lot.quantity, 0) > 0
  );

  const quotes = await Promise.all(
    tickers.map(async (ticker) => ({ ticker, quote: await getQuote(ticker).catch(() => null) }))
  );
  const quoteByTicker = new Map(quotes.map((q) => [q.ticker, q.quote]));

  const holdings: Holding[] = [];
  for (const ticker of tickers) {
    const lots = openLots.get(ticker) ?? [];
    const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (quantity <= 0) continue;

    const totalValuePaid = lots.reduce((sum, lot) => sum + lot.quantity * lot.price, 0);
    const pricePaid = totalValuePaid / quantity;
    const quote = quoteByTicker.get(ticker) ?? null;
    const currentPrice = quote?.regularMarketPrice ?? null;
    const totalValue = currentPrice !== null ? quantity * currentPrice : null;
    const percentChange = currentPrice !== null && pricePaid > 0 ? currentPrice / pricePaid - 1 : null;
    const info = meta.get(ticker);

    holdings.push({
      ticker,
      companyName: info?.companyName ?? quote?.longName ?? quote?.shortName ?? null,
      pricePaid,
      currentPrice,
      percentChange,
      sector: info?.sector ?? null,
      quantity,
      totalValuePaid,
      totalValue,
    });
  }

  const soldHoldings: SoldHolding[] = [];
  for (const [ticker, agg] of soldAgg) {
    const info = meta.get(ticker);
    const pricePaid = agg.quantitySold > 0 ? agg.costBasis / agg.quantitySold : null;
    const salePrice = agg.quantitySold > 0 ? agg.proceeds / agg.quantitySold : null;
    soldHoldings.push({
      ticker,
      companyName: info?.companyName ?? null,
      pricePaid,
      salePrice,
      percentChange: pricePaid && salePrice ? salePrice / pricePaid - 1 : null,
      sector: info?.sector ?? null,
      quantitySold: agg.quantitySold,
      costBasis: agg.costBasis,
      proceeds: agg.proceeds,
      realizedGain: agg.proceeds - agg.costBasis,
    });
  }

  const totalValue = holdings.reduce((sum, h) => sum + (h.totalValue ?? 0), 0);
  const totalValuePaid = holdings.reduce((sum, h) => sum + (h.totalValuePaid ?? 0), 0);
  const realizedGain = soldHoldings.reduce((sum, h) => sum + (h.realizedGain ?? 0), 0);
  const costBasisSold = soldHoldings.reduce((sum, h) => sum + (h.costBasis ?? 0), 0);
  const totalCostBasisEver = totalValuePaid + costBasisSold;
  const totalGain = totalValue - totalValuePaid + realizedGain;

  const sectorMap = new Map<string, number>();
  for (const h of holdings) {
    if (!h.sector || h.totalValue === null) continue;
    sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + h.totalValue);
  }
  const sectorAllocation: SectorAllocation[] = Array.from(sectorMap.entries())
    .map(([sector, capital]) => ({
      sector,
      capital,
      percentOfPortfolio: totalValue > 0 ? capital / totalValue : null,
    }))
    .sort((a, b) => (b.capital ?? 0) - (a.capital ?? 0));

  const summary: PortfolioSummary = {
    totalValue: holdings.length > 0 ? totalValue : null,
    totalValuePaid: holdings.length > 0 ? totalValuePaid : null,
    percentChange: totalValuePaid > 0 ? totalValue / totalValuePaid - 1 : null,
    numberOfHoldings: holdings.length,
    cash: null,
    realizedGain: soldHoldings.length > 0 ? realizedGain : null,
    percentChangeInclRealized: totalCostBasisEver > 0 ? totalGain / totalCostBasisEver : null,
  };

  return {
    summary,
    holdings,
    soldHoldings,
    sectorAllocation,
    ytdHoldings: [],
    ytdSectorPerformance: [],
    ytdPortfolioReturn: null,
    lastUpdated: new Date().toISOString(),
  };
}
