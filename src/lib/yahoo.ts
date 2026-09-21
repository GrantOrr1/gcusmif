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

export type RangeKey = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "ytd" | "1y" | "3y";

/** Ranges plotted with intraday bars (full timestamps) instead of one point per day. */
const INTRADAY_RANGES = new Set<RangeKey>(["1d", "5d"]);

function intervalForRange(range: RangeKey): string {
  if (range === "1d") return "5m";
  if (range === "5d") return "1h";
  if (range === "3y") return "1wk";
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
  bookValue: number | null;
  operatingCashflow: number | null;
  freeCashflow: number | null;

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
  types: string[]
): Promise<Record<string, FundamentalsSeries>> {
  async function fetchOnce(auth: YahooAuth | null) {
    const now = Math.floor(Date.now() / 1000);
    const period1 = now - 500 * 24 * 60 * 60;
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
  ]).catch(() => ({}) as Record<string, FundamentalsSeries>);

  const dilutedEps = fundamentals.quarterlyDilutedEPS ?? new Map();
  const totalRevenue = fundamentals.quarterlyTotalRevenue ?? new Map();
  const netIncome = fundamentals.quarterlyNetIncome ?? new Map();
  const normalizedIncome = fundamentals.quarterlyNormalizedIncome ?? new Map();

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
    };
  });

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
    bookValue: rawNumber(keyStats.bookValue),
    operatingCashflow: rawNumber(financialData.operatingCashflow),
    freeCashflow: rawNumber(financialData.freeCashflow),

    earningsQuarters,
  };
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
