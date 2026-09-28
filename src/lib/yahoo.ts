export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

export type QuotePoint = {
  date: string;
  close: number | null;
};

export type Quote = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  currency: string | null;
  exchangeName: string | null;
  regularMarketPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketCap: number | null;
  volume: number | null;
  history: QuotePoint[];
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export type RangeKey = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "ytd" | "1y" | "3y" | "7y";

/** Ranges plotted with intraday bars (full timestamps) instead of one point per day. */
const INTRADAY_RANGES = new Set<RangeKey>(["1d", "5d"]);

function intervalForRange(range: RangeKey): string {
  if (range === "1d") return "5m";
  if (range === "5d") return "1h";
  if (range === "3y" || range === "7y") return "1wk";
  return "1d";
}

export async function getHistoricalCloses(
  symbol: string,
  range: RangeKey
): Promise<QuotePoint[]> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("range", range);
  url.searchParams.set("interval", intervalForRange(range));

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const intraday = INTRADAY_RANGES.has(range);

  return timestamps.map((t, i) => {
    const iso = new Date(t * 1000).toISOString();
    return {
      date: intraday ? iso : iso.slice(0, 10),
      close: closes[i] ?? null,
    };
  });
}

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  if (!query.trim()) return [];

  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", query);
  url.searchParams.set("quotesCount", "8");
  url.searchParams.set("newsCount", "0");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = await res.json();
  type RawQuote = {
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quoteType?: string;
  };
  const quotes: RawQuote[] = json?.quotes ?? [];

  return quotes
    .filter((q) => q.symbol)
    .map((q) => ({
      symbol: q.symbol as string,
      name: q.shortname ?? q.longname ?? (q.symbol as string),
      exchange: q.exchange ?? "",
      type: q.quoteType ?? "",
    }));
}

export type NewsItem = {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string;
};

const NOTICE_KEYWORDS =
  /trial|clinical|phase [1-3]|fda\b|earnings|eps\b|guidance|quarterly (results|report)|q[1-4]\s?(results|earnings)|10-?q|10-?k/i;

export async function getRecentNews(symbol: string): Promise<NewsItem[]> {
  const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
  url.searchParams.set("q", symbol);
  url.searchParams.set("quotesCount", "0");
  url.searchParams.set("newsCount", "20");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];

  const json = await res.json();
  type RawNews = {
    title?: string;
    link?: string;
    publisher?: string;
    providerPublishTime?: number;
  };
  const news: RawNews[] = json?.news ?? [];

  return news
    .filter((n) => n.title && n.link && n.providerPublishTime)
    .map((n) => ({
      title: n.title as string,
      link: n.link as string,
      publisher: n.publisher ?? "",
      publishedAt: new Date((n.providerPublishTime as number) * 1000).toISOString(),
    }));
}

async function getUpcomingEarningsDate(symbol: string): Promise<string | null> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("modules", "calendarEvents");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const raw = json?.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate?.[0]?.raw;
  return typeof raw === "number" ? new Date(raw * 1000).toISOString() : null;
}

/**
 * Up to 5 headlines about trial/clinical data or earnings — recent (last 21 days)
 * or upcoming (next 21 days, for earnings calls) — sorted most relevant first.
 */
export async function getNoticeHeadlines(symbol: string): Promise<NewsItem[]> {
  const [news, earningsDateIso] = await Promise.all([
    getRecentNews(symbol).catch(() => []),
    getUpcomingEarningsDate(symbol).catch(() => null),
  ]);

  const cutoffPast = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const cutoffFuture = Date.now() + 21 * 24 * 60 * 60 * 1000;

  const items: NewsItem[] = news.filter((n) => {
    const t = new Date(n.publishedAt).getTime();
    return NOTICE_KEYWORDS.test(n.title) && t >= cutoffPast && t <= cutoffFuture;
  });

  if (earningsDateIso) {
    const t = new Date(earningsDateIso).getTime();
    if (t >= cutoffPast && t <= cutoffFuture) {
      items.push({
        title: `Upcoming earnings call — ${new Date(earningsDateIso).toLocaleDateString()}`,
        link: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`,
        publisher: "Yahoo Finance",
        publishedAt: earningsDateIso,
      });
    }
  }

  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return items.slice(0, 5);
}

export type QuoteSummaryDetails = {
  open: number | null;
  previousClose: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  volume: number | null;
  averageVolume: number | null;
  marketCap: number | null;
  beta: number | null;
  trailingPE: number | null;
  trailingEps: number | null;
  dividendRate: number | null;
  dividendYield: number | null;
  earningsDate: string | null;
  targetMeanPrice: number | null;

  // Valuation Measures
  enterpriseValue: number | null;
  forwardPE: number | null;
  pegRatio: number | null;
  priceToSalesTrailing12Months: number | null;
  priceToBook: number | null;
  enterpriseToRevenue: number | null;
  enterpriseToEbitda: number | null;

  // Financial Highlights
  lastFiscalYearEnd: string | null;
  mostRecentQuarter: string | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
  totalRevenue: number | null;
  revenuePerShare: number | null;
  revenueGrowth: number | null;
  grossProfits: number | null;
  ebitda: number | null;
  netIncomeToCommon: number | null;
  earningsGrowth: number | null;
  totalCash: number | null;
  totalCashPerShare: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  bookValue: number | null;
  operatingCashflow: number | null;
  freeCashflow: number | null;

  // Most recent reported quarter
  operatingMarginRecentQuarter: number | null;
  netMarginRecentQuarter: number | null;
  operatingNWC: number | null;

  // Earnings trends — last 4 quarters
  earningsQuarters: EarningsQuarter[];
};

export type EarningsQuarter = {
  label: string;
  periodEnd: string;
  epsEstimate: number | null;
  epsGaap: number | null;
  epsNormalized: number | null;
  revenue: number | null;
  earnings: number | null;
  ebitda: number | null;
};

function rawNumber(field: unknown): number | null {
  if (field && typeof field === "object" && "raw" in field) {
    const raw = (field as { raw?: unknown }).raw;
    if (typeof raw === "number") return raw;
  }
  return null;
}

type YahooAuth = { cookie: string; crumb: string };
let cachedYahooAuth: YahooAuth | null = null;
let yahooAuthPromise: Promise<YahooAuth | null> | null = null;

/** quoteSummary requires a session cookie + crumb (unlike the chart/search endpoints). */
async function getYahooAuth(): Promise<YahooAuth | null> {
  if (cachedYahooAuth) return cachedYahooAuth;
  if (yahooAuthPromise) return yahooAuthPromise;

  yahooAuthPromise = (async () => {
    try {
      const homeRes = await fetch("https://fc.yahoo.com/", {
        headers: { "User-Agent": USER_AGENT },
        redirect: "manual",
      });
      const setCookies = homeRes.headers.getSetCookie?.() ?? [];
      const cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
      if (!cookie) return null;

      const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
        headers: { "User-Agent": USER_AGENT, Cookie: cookie },
      });
      if (!crumbRes.ok) return null;
      const crumb = (await crumbRes.text()).trim();
      if (!crumb || crumb.includes("<html")) return null;

      cachedYahooAuth = { cookie, crumb };
      return cachedYahooAuth;
    } catch {
      return null;
    } finally {
      yahooAuthPromise = null;
    }
  })();

  return yahooAuthPromise;
}

type FundamentalsSeries = Map<string, number>;

/** One data series (e.g. quarterlyDilutedEPS) from the fundamentals-timeseries endpoint, keyed by asOfDate. */
async function fetchFundamentalsSeries(
  symbol: string,
  types: string[],
  lookbackDays = 500
): Promise<Record<string, FundamentalsSeries>> {
  async function fetchOnce(auth: YahooAuth | null) {
    const now = Math.floor(Date.now() / 1000);
    const period1 = now - lookbackDays * 24 * 60 * 60;
    const url = new URL(
      `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}`
    );
    url.searchParams.set("type", types.join(","));
    url.searchParams.set("period1", String(period1));
    url.searchParams.set("period2", String(now));
    if (auth) url.searchParams.set("crumb", auth.crumb);

    return fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        ...(auth ? { Cookie: auth.cookie } : {}),
      },
      next: { revalidate: 0 },
    });
  }

  let res = await fetchOnce(await getYahooAuth());
  if (res.status === 401) {
    cachedYahooAuth = null;
    res = await fetchOnce(await getYahooAuth());
  }
  if (!res.ok) return {};

  const json = await res.json();
  const results: {
    meta?: { type?: string[] };
    [key: string]: unknown;
  }[] = json?.timeseries?.result ?? [];

  const out: Record<string, FundamentalsSeries> = {};
  for (const result of results) {
    const type = result.meta?.type?.[0];
    if (!type) continue;
    const entries = (result[type] ?? []) as (
      | { asOfDate?: string; reportedValue?: { raw?: number } }
      | null
    )[];
    const series: FundamentalsSeries = new Map();
    for (const entry of entries) {
      if (entry?.asOfDate && typeof entry.reportedValue?.raw === "number") {
        series.set(entry.asOfDate, entry.reportedValue.raw);
      }
    }
    out[type] = series;
  }
  return out;
}

/** The classic Yahoo Finance "Summary" quote-page stats, via quoteSummary. */
export async function getQuoteSummaryDetails(symbol: string): Promise<QuoteSummaryDetails | null> {
  async function fetchOnce(auth: YahooAuth | null) {
    const url = new URL(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`
    );
    url.searchParams.set(
      "modules",
      "summaryDetail,defaultKeyStatistics,financialData,calendarEvents,earnings,earningsHistory"
    );
    if (auth) url.searchParams.set("crumb", auth.crumb);

    return fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        ...(auth ? { Cookie: auth.cookie } : {}),
      },
      next: { revalidate: 0 },
    });
  }

  let res = await fetchOnce(await getYahooAuth());
  if (res.status === 401) {
    cachedYahooAuth = null;
    res = await fetchOnce(await getYahooAuth());
  }
  if (!res.ok) return null;

  const json = await res.json();
  const result = json?.quoteSummary?.result?.[0];
  if (!result) return null;

  const summaryDetail = result.summaryDetail ?? {};
  const keyStats = result.defaultKeyStatistics ?? {};
  const financialData = result.financialData ?? {};
  const earningsRaw = result.calendarEvents?.earnings?.earningsDate?.[0]?.raw;

  function rawDate(field: unknown): string | null {
    if (field && typeof field === "object" && "raw" in field) {
      const raw = (field as { raw?: unknown }).raw;
      if (typeof raw === "number") return new Date(raw * 1000).toISOString();
    }
    return null;
  }

  const historyByQuarter = new Map<string, { epsEstimate: number | null }>();
  for (const h of result.earningsHistory?.history ?? []) {
    const date = (h as { quarter?: { fmt?: string } }).quarter?.fmt;
    if (date) historyByQuarter.set(date, { epsEstimate: rawNumber((h as { epsEstimate?: unknown }).epsEstimate) });
  }

  const fundamentals = await fetchFundamentalsSeries(symbol, [
    "quarterlyDilutedEPS",
    "quarterlyTotalRevenue",
    "quarterlyNetIncome",
    "quarterlyNormalizedIncome",
    "quarterlyEBITDA",
    "quarterlyOperatingIncome",
    "quarterlyWorkingCapital",
  ]).catch(() => ({}) as Record<string, FundamentalsSeries>);

  const dilutedEps = fundamentals.quarterlyDilutedEPS ?? new Map();
  const totalRevenue = fundamentals.quarterlyTotalRevenue ?? new Map();
  const netIncome = fundamentals.quarterlyNetIncome ?? new Map();
  const normalizedIncome = fundamentals.quarterlyNormalizedIncome ?? new Map();
  const quarterlyEbitda = fundamentals.quarterlyEBITDA ?? new Map();
  const operatingIncome = fundamentals.quarterlyOperatingIncome ?? new Map();
  const workingCapital = fundamentals.quarterlyWorkingCapital ?? new Map();

  const quarterDates = Array.from(dilutedEps.keys()).sort();
  const earningsQuarters: EarningsQuarter[] = quarterDates.slice(-4).map((date) => {
    const gaap = dilutedEps.get(date) ?? null;
    const net = netIncome.get(date) ?? null;
    const normalized = normalizedIncome.get(date) ?? null;
    const epsNormalized =
      gaap !== null && net !== null && net !== 0 && normalized !== null
        ? gaap * (normalized / net)
        : gaap;

    return {
      label: new Date(date).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      periodEnd: date,
      epsEstimate: historyByQuarter.get(date)?.epsEstimate ?? null,
      epsGaap: gaap,
      epsNormalized,
      revenue: totalRevenue.get(date) ?? null,
      earnings: net,
      ebitda: quarterlyEbitda.get(date) ?? null,
    };
  });

  const mostRecentOpIncomeDate = Array.from(operatingIncome.keys()).sort().at(-1);
  const recentOpIncome = mostRecentOpIncomeDate ? (operatingIncome.get(mostRecentOpIncomeDate) ?? null) : null;
  const recentOpRevenue = mostRecentOpIncomeDate ? (totalRevenue.get(mostRecentOpIncomeDate) ?? null) : null;
  const operatingMarginRecentQuarter =
    recentOpIncome !== null && recentOpRevenue ? recentOpIncome / recentOpRevenue : null;

  const mostRecentNetIncomeDate = Array.from(netIncome.keys()).sort().at(-1);
  const recentNetIncome = mostRecentNetIncomeDate ? (netIncome.get(mostRecentNetIncomeDate) ?? null) : null;
  const recentNetRevenue = mostRecentNetIncomeDate ? (totalRevenue.get(mostRecentNetIncomeDate) ?? null) : null;
  const netMarginRecentQuarter =
    recentNetIncome !== null && recentNetRevenue ? recentNetIncome / recentNetRevenue : null;

  const mostRecentWorkingCapitalDate = Array.from(workingCapital.keys()).sort().at(-1);
  const operatingNWC = mostRecentWorkingCapitalDate
    ? (workingCapital.get(mostRecentWorkingCapitalDate) ?? null)
    : null;

  return {
    open: rawNumber(summaryDetail.open),
    previousClose: rawNumber(summaryDetail.previousClose),
    dayLow: rawNumber(summaryDetail.dayLow),
    dayHigh: rawNumber(summaryDetail.dayHigh),
    fiftyTwoWeekLow: rawNumber(summaryDetail.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: rawNumber(summaryDetail.fiftyTwoWeekHigh),
    volume: rawNumber(summaryDetail.volume),
    averageVolume: rawNumber(summaryDetail.averageVolume),
    marketCap: rawNumber(summaryDetail.marketCap),
    beta: rawNumber(summaryDetail.beta),
    trailingPE: rawNumber(summaryDetail.trailingPE),
    trailingEps: rawNumber(keyStats.trailingEps),
    dividendRate: rawNumber(summaryDetail.dividendRate),
    dividendYield: rawNumber(summaryDetail.dividendYield),
    earningsDate: typeof earningsRaw === "number" ? new Date(earningsRaw * 1000).toISOString() : null,
    targetMeanPrice: rawNumber(financialData.targetMeanPrice),

    enterpriseValue: rawNumber(keyStats.enterpriseValue),
    forwardPE: rawNumber(keyStats.forwardPE),
    pegRatio: rawNumber(keyStats.pegRatio),
    priceToSalesTrailing12Months: rawNumber(keyStats.priceToSalesTrailing12Months),
    priceToBook: rawNumber(keyStats.priceToBook),
    enterpriseToRevenue: rawNumber(keyStats.enterpriseToRevenue),
    enterpriseToEbitda: rawNumber(keyStats.enterpriseToEbitda),

    lastFiscalYearEnd: rawDate(keyStats.lastFiscalYearEnd),
    mostRecentQuarter: rawDate(keyStats.mostRecentQuarter),
    profitMargins: rawNumber(financialData.profitMargins ?? keyStats.profitMargins),
    operatingMargins: rawNumber(financialData.operatingMargins),
    returnOnAssets: rawNumber(financialData.returnOnAssets),
    returnOnEquity: rawNumber(financialData.returnOnEquity),
    totalRevenue: rawNumber(financialData.totalRevenue),
    revenuePerShare: rawNumber(financialData.revenuePerShare),
    revenueGrowth: rawNumber(financialData.revenueGrowth),
    grossProfits: rawNumber(financialData.grossProfits),
    ebitda: rawNumber(financialData.ebitda),
    netIncomeToCommon: rawNumber(keyStats.netIncomeToCommon),
    earningsGrowth: rawNumber(financialData.earningsGrowth),
    totalCash: rawNumber(financialData.totalCash),
    totalCashPerShare: rawNumber(financialData.totalCashPerShare),
    totalDebt: rawNumber(financialData.totalDebt),
    debtToEquity: rawNumber(financialData.debtToEquity),
    currentRatio: rawNumber(financialData.currentRatio),
    quickRatio: rawNumber(financialData.quickRatio),
    bookValue: rawNumber(keyStats.bookValue),
    operatingCashflow: rawNumber(financialData.operatingCashflow),
    freeCashflow: rawNumber(financialData.freeCashflow),

    operatingMarginRecentQuarter,
    netMarginRecentQuarter,
    operatingNWC,

    earningsQuarters,
  };
}

/**
 * One Comp Sheet period column's worth of data. Field names deliberately
 * match the corresponding CompMetric.key in compMetrics.ts, so the frontend
 * can look values up generically instead of a per-metric mapping.
 */
export type CompPeriodFinancials = {
  periodKey: string; // "2026-Q3" (calendar quarter) or "2026" (calendar year)

  price: number | null;
  marketCap: number | null;
  totalRevenue: number | null;
  netIncomeToCommon: number | null;
  ebitda: number | null;
  trailingEps: number | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  totalCash: number | null;
  totalCashPerShare: number | null;
  totalDebt: number | null;
  bookValue: number | null;
  priceToBook: number | null;
  revenuePerShare: number | null;
  enterpriseValue: number | null;

  // For quarter periods these use a trailing-four-quarter basis (like a
  // rolling TTM); for year periods they use the reported annual figures.
  // Null when there isn't enough quarterly history yet to compute a trailing sum.
  trailingPE: number | null;
  priceToSalesTrailing12Months: number | null;
  enterpriseToRevenue: number | null;
  enterpriseToEbitda: number | null;
  returnOnAssets: number | null;
  returnOnEquity: number | null;
};

/** Calendar-quarter or calendar-year bucket for a reported-period end date, e.g. "2026-Q3" or "2026". */
function periodKeyForDate(dateStr: string, kind: "quarter" | "year"): string {
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  if (kind === "year") return `${year}`;
  const quarter = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

type RawPeriodPoint = {
  date: string;
  revenue: number | null;
  netIncome: number | null;
  ebitda: number | null;
  operatingIncome: number | null;
  eps: number | null;
  shares: number | null;
  equity: number | null;
  totalAssets: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  cash: number | null;
  totalDebt: number | null;
};

const PERIOD_FIELD_TYPES = {
  revenue: "TotalRevenue",
  netIncome: "NetIncome",
  ebitda: "EBITDA",
  operatingIncome: "OperatingIncome",
  eps: "DilutedEPS",
  shares: "OrdinarySharesNumber",
  equity: "StockholdersEquity",
  totalAssets: "TotalAssets",
  currentAssets: "CurrentAssets",
  currentLiabilities: "CurrentLiabilities",
  cash: "CashAndCashEquivalents",
  totalDebt: "TotalDebt",
} as const;

async function fetchPeriodPoints(
  symbol: string,
  prefix: "quarterly" | "annual",
  lookbackDays: number
): Promise<RawPeriodPoint[]> {
  const typeFor = (field: keyof typeof PERIOD_FIELD_TYPES) => `${prefix}${PERIOD_FIELD_TYPES[field]}`;
  const series = await fetchFundamentalsSeries(
    symbol,
    Object.keys(PERIOD_FIELD_TYPES).map((f) => typeFor(f as keyof typeof PERIOD_FIELD_TYPES)),
    lookbackDays
  ).catch(() => ({}) as Record<string, FundamentalsSeries>);

  const dates = new Set<string>();
  for (const field of Object.keys(PERIOD_FIELD_TYPES) as (keyof typeof PERIOD_FIELD_TYPES)[]) {
    for (const date of (series[typeFor(field)] ?? new Map()).keys()) dates.add(date);
  }

  return Array.from(dates).map((date) => ({
    date,
    revenue: series[typeFor("revenue")]?.get(date) ?? null,
    netIncome: series[typeFor("netIncome")]?.get(date) ?? null,
    ebitda: series[typeFor("ebitda")]?.get(date) ?? null,
    operatingIncome: series[typeFor("operatingIncome")]?.get(date) ?? null,
    eps: series[typeFor("eps")]?.get(date) ?? null,
    shares: series[typeFor("shares")]?.get(date) ?? null,
    equity: series[typeFor("equity")]?.get(date) ?? null,
    totalAssets: series[typeFor("totalAssets")]?.get(date) ?? null,
    currentAssets: series[typeFor("currentAssets")]?.get(date) ?? null,
    currentLiabilities: series[typeFor("currentLiabilities")]?.get(date) ?? null,
    cash: series[typeFor("cash")]?.get(date) ?? null,
    totalDebt: series[typeFor("totalDebt")]?.get(date) ?? null,
  }));
}

/** Last close on or before the target date; falls back to the nearest available close. */
function closestCloseOnOrBefore(closes: { date: string; close: number }[], targetDate: string): number | null {
  let best: { date: string; close: number } | null = null;
  for (const c of closes) {
    if (c.date <= targetDate && (!best || c.date > best.date)) best = c;
  }
  if (best) return best.close;

  let nearest: { date: string; close: number } | null = null;
  let bestDiff = Infinity;
  const targetMs = new Date(targetDate).getTime();
  for (const c of closes) {
    const diff = Math.abs(new Date(c.date).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      nearest = c;
    }
  }
  return nearest?.close ?? null;
}

type TrailingBasis = { revenue: number | null; netIncome: number | null; ebitda: number | null; eps: number | null };

/** Sum of a field across a quarter and its 3 predecessors; null if any is missing or there's not enough history. */
function trailingFourQuarterSum(
  sorted: RawPeriodPoint[],
  endIndex: number,
  field: "revenue" | "netIncome" | "ebitda" | "eps"
): number | null {
  if (endIndex < 3) return null;
  let sum = 0;
  for (let i = endIndex - 3; i <= endIndex; i++) {
    const v = sorted[i][field];
    if (typeof v !== "number") return null;
    sum += v;
  }
  return sum;
}

/** Rolling trailing-twelve-month Revenue/Net Income/EBITDA/EPS for every reported quarter, keyed by periodKey. */
function buildQuarterlyTrailingBasis(quarterlyPoints: RawPeriodPoint[]): Map<string, TrailingBasis> {
  const sorted = [...quarterlyPoints].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const out = new Map<string, TrailingBasis>();
  sorted.forEach((point, i) => {
    out.set(periodKeyForDate(point.date, "quarter"), {
      revenue: trailingFourQuarterSum(sorted, i, "revenue"),
      netIncome: trailingFourQuarterSum(sorted, i, "netIncome"),
      ebitda: trailingFourQuarterSum(sorted, i, "ebitda"),
      eps: trailingFourQuarterSum(sorted, i, "eps"),
    });
  });
  return out;
}

/**
 * Real per-period financials for the Comp Sheet's period columns, bucketed
 * by calendar quarter/year so periods line up across companies with
 * different fiscal calendars. Ratios that need a trailing-twelve-month basis
 * (P/E, P/S, EV multiples, ROA, ROE) use a rolling trailing-four-quarter sum
 * for quarter periods (null until 4 quarters of history exist) and the
 * reported annual figures for year periods. Companies whose fiscal quarter
 * doesn't land on a calendar-quarter boundary may show gaps.
 */
export async function getPeriodicFinancials(symbol: string): Promise<CompPeriodFinancials[]> {
  const [quarterlyPoints, annualPoints, closesRaw] = await Promise.all([
    fetchPeriodPoints(symbol, "quarterly", 2600),
    fetchPeriodPoints(symbol, "annual", 2600),
    getHistoricalCloses(symbol, "7y").catch(() => []),
  ]);

  const closes: { date: string; close: number }[] = [];
  for (const c of closesRaw) {
    if (c.close !== null) closes.push({ date: c.date, close: c.close });
  }

  const quarterlyTrailing = buildQuarterlyTrailingBasis(quarterlyPoints);

  const buckets = new Map<string, { kind: "quarter" | "year"; point: RawPeriodPoint }>();
  for (const point of quarterlyPoints) {
    buckets.set(periodKeyForDate(point.date, "quarter"), { kind: "quarter", point });
  }
  for (const point of annualPoints) {
    buckets.set(periodKeyForDate(point.date, "year"), { kind: "year", point });
  }

  const out: CompPeriodFinancials[] = [];
  for (const [periodKey, { kind, point }] of buckets) {
    const price = closestCloseOnOrBefore(closes, point.date);
    const marketCap = price !== null && point.shares !== null ? price * point.shares : null;
    const enterpriseValue =
      marketCap !== null && point.totalDebt !== null && point.cash !== null
        ? marketCap + point.totalDebt - point.cash
        : null;
    const profitMargins = point.netIncome !== null && point.revenue ? point.netIncome / point.revenue : null;
    const operatingMargins =
      point.operatingIncome !== null && point.revenue ? point.operatingIncome / point.revenue : null;
    const currentRatio =
      point.currentAssets !== null && point.currentLiabilities
        ? point.currentAssets / point.currentLiabilities
        : null;
    const debtToEquity = point.totalDebt !== null && point.equity ? point.totalDebt / point.equity : null;
    const bookValue = point.equity !== null && point.shares ? point.equity / point.shares : null;
    const priceToBook = price !== null && bookValue ? price / bookValue : null;
    const revenuePerShare = point.revenue !== null && point.shares ? point.revenue / point.shares : null;
    const totalCashPerShare = point.cash !== null && point.shares ? point.cash / point.shares : null;

    const trailingBasis: TrailingBasis =
      kind === "year"
        ? { revenue: point.revenue, netIncome: point.netIncome, ebitda: point.ebitda, eps: point.eps }
        : (quarterlyTrailing.get(periodKey) ?? { revenue: null, netIncome: null, ebitda: null, eps: null });

    out.push({
      periodKey,
      price,
      marketCap,
      totalRevenue: point.revenue,
      netIncomeToCommon: point.netIncome,
      ebitda: point.ebitda,
      trailingEps: point.eps,
      profitMargins,
      operatingMargins,
      currentRatio,
      debtToEquity,
      totalCash: point.cash,
      totalCashPerShare,
      totalDebt: point.totalDebt,
      bookValue,
      priceToBook,
      revenuePerShare,
      enterpriseValue,
      trailingPE: price !== null && trailingBasis.eps ? price / trailingBasis.eps : null,
      priceToSalesTrailing12Months:
        marketCap !== null && trailingBasis.revenue ? marketCap / trailingBasis.revenue : null,
      enterpriseToRevenue:
        enterpriseValue !== null && trailingBasis.revenue ? enterpriseValue / trailingBasis.revenue : null,
      enterpriseToEbitda:
        enterpriseValue !== null && trailingBasis.ebitda ? enterpriseValue / trailingBasis.ebitda : null,
      returnOnAssets:
        trailingBasis.netIncome !== null && point.totalAssets
          ? trailingBasis.netIncome / point.totalAssets
          : null,
      returnOnEquity:
        trailingBasis.netIncome !== null && point.equity ? trailingBasis.netIncome / point.equity : null,
    });
  }

  return out;
}

export async function getQuote(symbol: string): Promise<Quote | null> {
  const url = new URL(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
  );
  url.searchParams.set("range", "1y");
  url.searchParams.set("interval", "1d");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta ?? {};
  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  const history: QuotePoint[] = timestamps.map((t, i) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    close: closes[i] ?? null,
  }));

  const regularMarketPrice = meta.regularMarketPrice ?? null;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const change =
    regularMarketPrice !== null && previousClose !== null
      ? regularMarketPrice - previousClose
      : null;
  const changePercent =
    change !== null && previousClose ? change / previousClose : null;

  return {
    symbol: meta.symbol ?? symbol.toUpperCase(),
    shortName: meta.shortName ?? null,
    longName: meta.longName ?? null,
    currency: meta.currency ?? null,
    exchangeName: meta.fullExchangeName ?? meta.exchangeName ?? null,
    regularMarketPrice,
    previousClose,
    change,
    changePercent,
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    marketCap: meta.marketCap ?? null,
    volume: meta.regularMarketVolume ?? null,
    history,
  };
}

// Our fund's sector codes don't map one-to-one onto Yahoo's own sector
// taxonomy, so each is expressed as one or more Yahoo sector values to
// query for. "AGN" (Industry Agnostic) has no Yahoo sector equivalent and
// is intentionally left out.
const YAHOO_SECTOR_FILTERS: Record<string, string[]> = {
  TMT: ["Technology", "Communication Services"],
  FIG: ["Financial Services"],
  HC: ["Healthcare"],
  CONS: ["Consumer Cyclical", "Consumer Defensive"],
  IND: ["Industrials"],
  ENER: ["Energy"],
};

export type ScreenedEquity = {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  averageAnalystRating: string | null;
};

/** Top N equities in a sector, ranked by Yahoo's own "Avg. Analyst Rating" screener field (1.0 = Strong Buy). */
export async function getTopRatedEquitiesForSector(
  sectorCode: string,
  limit = 12
): Promise<ScreenedEquity[]> {
  const sectors = YAHOO_SECTOR_FILTERS[sectorCode];
  if (!sectors) return [];

  const sectorQuery =
    sectors.length > 1
      ? { operator: "or", operands: sectors.map((s) => ({ operator: "eq", operands: ["sector", s] })) }
      : { operator: "eq", operands: ["sector", sectors[0]] };

  async function fetchOnce(auth: YahooAuth | null) {
    const url = new URL("https://query2.finance.yahoo.com/v1/finance/screener");
    if (auth) url.searchParams.set("crumb", auth.crumb);

    const body = {
      size: limit,
      offset: 0,
      sortField: "average_analyst_rating",
      sortType: "ASC",
      quoteType: "EQUITY",
      query: {
        operator: "and",
        operands: [
          { operator: "eq", operands: ["region", "us"] },
          sectorQuery,
          // A low cap floor lets thin-coverage micro/small-caps (sometimes with
          // just 1-2 analysts) dominate the "best average rating" sort purely
          // from small-sample unanimity, crowding out well-covered large caps.
          // $10B biases toward names actually likely to clear the 9-analyst
          // minimum applied after this fetch.
          { operator: "gt", operands: ["intradaymarketcap", 10000000000] },
        ],
      },
    };

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        ...(auth ? { Cookie: auth.cookie } : {}),
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });
  }

  let res = await fetchOnce(await getYahooAuth());
  if (res.status === 401) {
    cachedYahooAuth = null;
    res = await fetchOnce(await getYahooAuth());
  }
  if (!res.ok) return [];

  const json = await res.json();
  type RawQuote = {
    symbol?: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice?: number;
    regularMarketChangePercent?: number;
    averageAnalystRating?: string;
  };
  const quotes: RawQuote[] = json?.finance?.result?.[0]?.quotes ?? [];

  return quotes
    .filter((q): q is RawQuote & { symbol: string } => typeof q.symbol === "string")
    .map((q) => ({
      symbol: q.symbol,
      name: q.longName ?? q.shortName ?? q.symbol,
      price: typeof q.regularMarketPrice === "number" ? q.regularMarketPrice : null,
      changePercent: typeof q.regularMarketChangePercent === "number" ? q.regularMarketChangePercent : null,
      averageAnalystRating: typeof q.averageAnalystRating === "string" ? q.averageAnalystRating : null,
    }));
}

export type AnalystRatingDetail = {
  recommendationKey: string | null;
  recommendationMean: number | null;
  numberOfAnalystOpinions: number | null;
  targetLowPrice: number | null;
  targetMeanPrice: number | null;
  targetHighPrice: number | null;
  trend: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null;
};

/** The fuller analyst-recommendation breakdown shown in each equity's ratings dropdown. */
export async function getAnalystRatingDetail(symbol: string): Promise<AnalystRatingDetail | null> {
  async function fetchOnce(auth: YahooAuth | null) {
    const url = new URL(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`
    );
    url.searchParams.set("modules", "financialData,recommendationTrend");
    if (auth) url.searchParams.set("crumb", auth.crumb);

    return fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        ...(auth ? { Cookie: auth.cookie } : {}),
      },
      next: { revalidate: 0 },
    });
  }

  // A burst of ~100+ of these individual per-symbol requests (one per
  // candidate equity, across every sector) reliably gets some fraction
  // connection-reset or otherwise dropped by Yahoo rather than answered with
  // a clean error response, so a single transient failure here is retried
  // once after a short delay before being treated as a real failure.
  async function attempt(): Promise<Response | null> {
    try {
      let res = await fetchOnce(await getYahooAuth());
      if (res.status === 401) {
        cachedYahooAuth = null;
        res = await fetchOnce(await getYahooAuth());
      }
      return res;
    } catch {
      return null;
    }
  }

  let res: Response | null = null;
  for (const delayMs of [0, 400, 900]) {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    res = await attempt();
    if (res?.ok) break;
  }
  if (!res || !res.ok) return null;

  const json = await res.json();
  const result = json?.quoteSummary?.result?.[0];
  const financialData = result?.financialData;
  if (!financialData) return null;

  const trendPeriod = result?.recommendationTrend?.trend?.[0];
  const trend =
    trendPeriod &&
    [trendPeriod.strongBuy, trendPeriod.buy, trendPeriod.hold, trendPeriod.sell, trendPeriod.strongSell].every(
      (v) => typeof v === "number"
    )
      ? {
          strongBuy: trendPeriod.strongBuy,
          buy: trendPeriod.buy,
          hold: trendPeriod.hold,
          sell: trendPeriod.sell,
          strongSell: trendPeriod.strongSell,
        }
      : null;

  return {
    recommendationKey: typeof financialData.recommendationKey === "string" ? financialData.recommendationKey : null,
    recommendationMean: rawNumber(financialData.recommendationMean),
    numberOfAnalystOpinions: rawNumber(financialData.numberOfAnalystOpinions),
    targetLowPrice: rawNumber(financialData.targetLowPrice),
    targetMeanPrice: rawNumber(financialData.targetMeanPrice),
    targetHighPrice: rawNumber(financialData.targetHighPrice),
    trend,
  };
}
