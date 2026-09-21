import * as XLSX from "xlsx";

export type Holding = {
  ticker: string;
  companyName: string | null;
  pricePaid: number | null;
  currentPrice: number | null;
  percentChange: number | null;
  sector: string | null;
  quantity: number | null;
  totalValuePaid: number | null;
  totalValue: number | null;
};

export type SectorAllocation = {
  sector: string;
  capital: number | null;
  percentOfPortfolio: number | null;
};

export type PortfolioSummary = {
  totalValue: number | null;
  totalValuePaid: number | null;
  percentChange: number | null;
  numberOfHoldings: number | null;
  cash: number | null;
  realizedGain: number | null;
  percentChangeInclRealized: number | null;
};

export type YtdHolding = {
  ticker: string;
  companyName: string | null;
  priceJan1: number | null;
  priceToday: number | null;
  percentChange: number | null;
  dayChangePercent: number | null;
  shares: number | null;
  totalPricePaid: number | null;
  totalCurrentPrice: number | null;
  sector: string | null;
};

export type YtdSectorPerformance = {
  sector: string;
  percentChange: number | null;
};

export type PortfolioData = {
  summary: PortfolioSummary;
  holdings: Holding[];
  sectorAllocation: SectorAllocation[];
  ytdHoldings: YtdHolding[];
  ytdSectorPerformance: YtdSectorPerformance[];
  ytdPortfolioReturn: number | null;
  lastUpdated: string;
};

type Row = unknown[];

type HeaderCell = { col: number; text: string };

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function cellNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[,%$]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getRuns(row: Row): HeaderCell[][] {
  const runs: HeaderCell[][] = [];
  let current: HeaderCell[] = [];
  row.forEach((value, col) => {
    const text = cellText(value);
    if (text) {
      current.push({ col, text });
    } else if (current.length) {
      runs.push(current);
      current = [];
    }
  });
  if (current.length) runs.push(current);
  return runs;
}

function findCol(run: HeaderCell[], matcher: RegExp): number | undefined {
  return run.find((c) => matcher.test(c.text))?.col;
}

function parsePortfolioSheet(rows: Row[]): {
  summary: PortfolioSummary;
  holdings: Holding[];
  sectorAllocation: SectorAllocation[];
} {
  let summaryRun: HeaderCell[] | undefined;
  let summaryRowIndex = -1;
  let holdingsRun: HeaderCell[] | undefined;
  let holdingsRowIndex = -1;
  let sectorRun: HeaderCell[] | undefined;
  let sectorRowIndex = -1;

  rows.forEach((row, rowIndex) => {
    const runs = getRuns(row);
    for (const run of runs) {
      const texts = run.map((c) => c.text.toLowerCase());
      if (!summaryRun && texts.some((t) => t.includes("# of holdings"))) {
        summaryRun = run;
        summaryRowIndex = rowIndex;
      }
      if (
        !holdingsRun &&
        texts.some((t) => /^tickers?$/.test(t))
      ) {
        holdingsRun = run;
        holdingsRowIndex = rowIndex;
      }
      if (
        !sectorRun &&
        run.length <= 3 &&
        texts.some((t) => t === "sector") &&
        !texts.some((t) => /^tickers?$/.test(t))
      ) {
        sectorRun = run;
        sectorRowIndex = rowIndex;
      }
    }
  });

  const summary: PortfolioSummary = {
    totalValue: null,
    totalValuePaid: null,
    percentChange: null,
    numberOfHoldings: null,
    cash: null,
    realizedGain: null,
    percentChangeInclRealized: null,
  };

  if (summaryRun && rows[summaryRowIndex + 1]) {
    const valueRow = rows[summaryRowIndex + 1];
    const totalValueCol = findCol(summaryRun, /^total value$/i);
    const totalValuePaidCol = findCol(summaryRun, /^total value paid$/i);
    const percentChangeCol = summaryRun.find(
      (c) => c.text.toLowerCase() === "% change"
    )?.col;
    const holdingsCol = findCol(summaryRun, /# of holdings/i);
    const cashCol = findCol(summaryRun, /^cash$/i);
    const realizedGainCol = findCol(summaryRun, /realized gain/i);
    const percentInclCol = findCol(summaryRun, /% change incl/i);

    summary.totalValue =
      totalValueCol !== undefined ? cellNumber(valueRow[totalValueCol]) : null;
    summary.totalValuePaid =
      totalValuePaidCol !== undefined
        ? cellNumber(valueRow[totalValuePaidCol])
        : null;
    summary.percentChange =
      percentChangeCol !== undefined
        ? cellNumber(valueRow[percentChangeCol])
        : null;
    summary.numberOfHoldings =
      holdingsCol !== undefined ? cellNumber(valueRow[holdingsCol]) : null;
    summary.cash = cashCol !== undefined ? cellNumber(valueRow[cashCol]) : null;
    summary.realizedGain =
      realizedGainCol !== undefined
        ? cellNumber(valueRow[realizedGainCol])
        : null;
    summary.percentChangeInclRealized =
      percentInclCol !== undefined ? cellNumber(valueRow[percentInclCol]) : null;
  }

  const holdings: Holding[] = [];
  if (holdingsRun) {
    const tickerCol = findCol(holdingsRun, /^tickers?$/i)!;
    const nameCol = findCol(holdingsRun, /company name/i);
    const pricePaidCol = findCol(holdingsRun, /^price paid$/i);
    const currentPriceCol = findCol(holdingsRun, /current share price/i);
    const percentChangeCol = holdingsRun.find(
      (c) => c.text.toLowerCase() === "% change"
    )?.col;
    const sectorCol = findCol(holdingsRun, /^sector$/i);
    const quantityCol = findCol(holdingsRun, /^quantity$/i);
    const totalValuePaidCol = findCol(holdingsRun, /^total value paid$/i);
    const totalValueCol = findCol(holdingsRun, /^total value$/i);

    for (let r = holdingsRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      const ticker = cellText(row?.[tickerCol]);
      if (!ticker) break;

      const quantity = quantityCol !== undefined ? cellNumber(row[quantityCol]) : null;
      const totalValue =
        totalValueCol !== undefined ? cellNumber(row[totalValueCol]) : null;
      // A second "positions sold" table below the live holdings reuses the
      // same header labels but has no quantity/market value — treat a row
      // with neither as the end of the live holdings table.
      if (quantity === null && totalValue === null) break;

      holdings.push({
        ticker,
        companyName: nameCol !== undefined ? cellText(row[nameCol]) || null : null,
        pricePaid: pricePaidCol !== undefined ? cellNumber(row[pricePaidCol]) : null,
        currentPrice:
          currentPriceCol !== undefined ? cellNumber(row[currentPriceCol]) : null,
        percentChange:
          percentChangeCol !== undefined ? cellNumber(row[percentChangeCol]) : null,
        sector: sectorCol !== undefined ? cellText(row[sectorCol]) || null : null,
        quantity,
        totalValuePaid:
          totalValuePaidCol !== undefined
            ? cellNumber(row[totalValuePaidCol])
            : null,
        totalValue,
      });
    }
  }

  const sectorAllocation: SectorAllocation[] = [];
  if (sectorRun) {
    const sectorCol = findCol(sectorRun, /^sector$/i)!;
    const capitalCol = findCol(sectorRun, /^capital$/i);
    const percentCol = findCol(sectorRun, /% of port/i);

    for (let r = sectorRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      const sector = cellText(row?.[sectorCol]);
      if (!sector) break;
      sectorAllocation.push({
        sector,
        capital: capitalCol !== undefined ? cellNumber(row[capitalCol]) : null,
        percentOfPortfolio:
          percentCol !== undefined ? cellNumber(row[percentCol]) : null,
      });
    }
  }

  return { summary, holdings, sectorAllocation };
}

/** Total Price Paid vs. Total Current Price across all YTD-tab holdings — matches the
 * per-row "% Change" formula in the spreadsheet, aggregated to a single portfolio figure. */
function computeYtdPortfolioReturn(holdings: YtdHolding[]): number | null {
  let paid = 0;
  let current = 0;
  let any = false;
  for (const h of holdings) {
    if (h.totalPricePaid !== null && h.totalCurrentPrice !== null) {
      paid += h.totalPricePaid;
      current += h.totalCurrentPrice;
      any = true;
    }
  }
  return any && paid !== 0 ? current / paid - 1 : null;
}

function parseYtdSheet(rows: Row[]): {
  ytdHoldings: YtdHolding[];
  ytdSectorPerformance: YtdSectorPerformance[];
  ytdPortfolioReturn: number | null;
} {
  let holdingsRun: HeaderCell[] | undefined;
  let holdingsRowIndex = -1;
  let sectorRun: HeaderCell[] | undefined;
  let sectorRowIndex = -1;

  rows.forEach((row, rowIndex) => {
    const runs = getRuns(row);
    for (const run of runs) {
      const texts = run.map((c) => c.text.toLowerCase());
      if (!holdingsRun && texts.some((t) => /^tickers?$/.test(t))) {
        holdingsRun = run;
        holdingsRowIndex = rowIndex;
      }
      if (
        !sectorRun &&
        run.length <= 3 &&
        texts.some((t) => t === "sector") &&
        !texts.some((t) => /^tickers?$/.test(t))
      ) {
        sectorRun = run;
        sectorRowIndex = rowIndex;
      }
    }
  });

  const ytdHoldings: YtdHolding[] = [];
  if (holdingsRun) {
    const tickerCol = findCol(holdingsRun, /^tickers?$/i)!;
    const nameCol = findCol(holdingsRun, /company name/i);
    const priceJan1Col = findCol(holdingsRun, /jan/i);
    const priceTodayCol = findCol(holdingsRun, /price today/i);
    const percentChangeCol = holdingsRun.find(
      (c) => c.text.toLowerCase() === "% change"
    )?.col;
    const dayChangeCol = findCol(holdingsRun, /day change/i);
    const sharesCol = findCol(holdingsRun, /^shares$/i);
    const totalPricePaidCol = findCol(holdingsRun, /total price paid/i);
    const totalCurrentPriceCol = findCol(holdingsRun, /total current price/i);
    const sectorCol = findCol(holdingsRun, /^sector$/i);

    for (let r = holdingsRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      const ticker = cellText(row?.[tickerCol]);
      if (!ticker) break;
      ytdHoldings.push({
        ticker,
        companyName: nameCol !== undefined ? cellText(row[nameCol]) || null : null,
        priceJan1: priceJan1Col !== undefined ? cellNumber(row[priceJan1Col]) : null,
        priceToday:
          priceTodayCol !== undefined ? cellNumber(row[priceTodayCol]) : null,
        percentChange:
          percentChangeCol !== undefined ? cellNumber(row[percentChangeCol]) : null,
        dayChangePercent:
          dayChangeCol !== undefined ? cellNumber(row[dayChangeCol]) : null,
        shares: sharesCol !== undefined ? cellNumber(row[sharesCol]) : null,
        totalPricePaid:
          totalPricePaidCol !== undefined
            ? cellNumber(row[totalPricePaidCol])
            : null,
        totalCurrentPrice:
          totalCurrentPriceCol !== undefined
            ? cellNumber(row[totalCurrentPriceCol])
            : null,
        sector: sectorCol !== undefined ? cellText(row[sectorCol]) || null : null,
      });
    }
  }

  const ytdSectorPerformance: YtdSectorPerformance[] = [];
  if (sectorRun) {
    const sectorCol = findCol(sectorRun, /^sector$/i)!;
    const percentCol = sectorRun.find((c) => c.text.toLowerCase() === "% change")
      ?.col;

    for (let r = sectorRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      const sector = cellText(row?.[sectorCol]);
      if (!sector) break;
      ytdSectorPerformance.push({
        sector,
        percentChange: percentCol !== undefined ? cellNumber(row[percentCol]) : null,
      });
    }
  }

  return { ytdHoldings, ytdSectorPerformance, ytdPortfolioReturn: computeYtdPortfolioReturn(ytdHoldings) };
}

function toDirectDropboxUrl(url: string): string {
  const u = new URL(url);
  u.searchParams.set("dl", "1");
  return u.toString();
}

async function fetchWorkbook(): Promise<XLSX.WorkBook> {
  const sourceUrl = process.env.PORTFOLIO_XLSX_URL;
  if (!sourceUrl) {
    throw new Error("PORTFOLIO_XLSX_URL environment variable is not set");
  }

  const response = await fetch(toDirectDropboxUrl(sourceUrl), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch portfolio workbook: ${response.status} ${response.statusText}`
    );
  }

  const buffer = await response.arrayBuffer();
  return XLSX.read(buffer, { type: "array" });
}

function sheetToRows(workbook: XLSX.WorkBook, name: string): Row[] {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });
}

/** Reads a specific cell (e.g. "M36") straight off a sheet by its own formula result. */
function readCell(workbook: XLSX.WorkBook, sheetName: string, address: string): number | null {
  const sheet = workbook.Sheets[sheetName];
  const cell = sheet?.[address];
  return typeof cell?.v === "number" && Number.isFinite(cell.v) ? cell.v : null;
}

const CACHE_TTL_MS = Number(process.env.PORTFOLIO_CACHE_TTL_MS ?? 5 * 60 * 1000);

let cache: { data: PortfolioData; fetchedAt: number } | null = null;
let inFlight: Promise<PortfolioData> | null = null;

async function loadPortfolioData(): Promise<PortfolioData> {
  const workbook = await fetchWorkbook();
  const portfolioSheetName =
    workbook.SheetNames.find((n) => n.toLowerCase() === "portfolio") ??
    workbook.SheetNames[0];
  const ytdSheetName = workbook.SheetNames.find((n) => n.toLowerCase() === "ytd");

  const portfolioRows = sheetToRows(workbook, portfolioSheetName);
  const { summary, holdings, sectorAllocation } = parsePortfolioSheet(portfolioRows);

  let ytdHoldings: YtdHolding[] = [];
  let ytdSectorPerformance: YtdSectorPerformance[] = [];
  let ytdPortfolioReturn: number | null = null;
  if (ytdSheetName) {
    const ytdRows = sheetToRows(workbook, ytdSheetName);
    const parsed = parseYtdSheet(ytdRows);
    ytdHoldings = parsed.ytdHoldings;
    ytdSectorPerformance = parsed.ytdSectorPerformance;
    // M36 is the sheet's own official YTD return — it folds in realized
    // gains from positions sold during the year via the adjustment rows
    // above it, which a plain sum of the still-held rows below would miss.
    ytdPortfolioReturn = readCell(workbook, ytdSheetName, "M36") ?? parsed.ytdPortfolioReturn;
  }

  return {
    summary,
    holdings,
    sectorAllocation,
    ytdHoldings,
    ytdSectorPerformance,
    ytdPortfolioReturn,
    lastUpdated: new Date().toISOString(),
  };
}

export async function getPortfolioData(): Promise<PortfolioData> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = loadPortfolioData()
    .then((data) => {
      cache = { data, fetchedAt: Date.now() };
      return data;
    })
    .catch((err) => {
      if (cache) {
        console.error("Portfolio refresh failed, serving stale cache:", err);
        return cache.data;
      }
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
