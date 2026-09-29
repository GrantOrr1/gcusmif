import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getQuote,
  getQuoteSummaryDetails,
  getPeriodicFinancials,
  getFxRateToUsd,
  type QuoteSummaryDetails,
  type CompPeriodFinancials,
} from "@/lib/yahoo";

// Ratios (P/E, margins, growth rates, etc.) are dimensionless and already
// currency-correct as reported. Only these dollar-shaped fields need
// converting when a company trades in a non-USD currency (e.g. a Tokyo
// listing quoted in JPY) — otherwise a Comp Sheet mixing US and foreign
// equities would show wildly wrong-scale prices, market caps, and revenue.
const USD_DETAIL_FIELDS: (keyof QuoteSummaryDetails)[] = [
  "open",
  "previousClose",
  "dayLow",
  "dayHigh",
  "fiftyTwoWeekLow",
  "fiftyTwoWeekHigh",
  "marketCap",
  "trailingEps",
  "dividendRate",
  "targetMeanPrice",
  "enterpriseValue",
  "totalRevenue",
  "revenuePerShare",
  "grossProfits",
  "ebitda",
  "netIncomeToCommon",
  "totalCash",
  "totalCashPerShare",
  "totalDebt",
  "bookValue",
  "operatingCashflow",
  "freeCashflow",
  "operatingNWC",
];

const USD_PERIOD_FIELDS: (keyof CompPeriodFinancials)[] = [
  "price",
  "marketCap",
  "totalRevenue",
  "netIncomeToCommon",
  "ebitda",
  "trailingEps",
  "totalCash",
  "totalCashPerShare",
  "totalDebt",
  "bookValue",
  "revenuePerShare",
  "enterpriseValue",
];

function convertDetailsToUsd(details: QuoteSummaryDetails, rate: number): QuoteSummaryDetails {
  const converted = { ...details };
  for (const field of USD_DETAIL_FIELDS) {
    const value = converted[field];
    if (typeof value === "number") {
      (converted[field] as number) = value * rate;
    }
  }
  converted.earningsQuarters = converted.earningsQuarters.map((q) => ({
    ...q,
    epsEstimate: q.epsEstimate !== null ? q.epsEstimate * rate : null,
    epsGaap: q.epsGaap !== null ? q.epsGaap * rate : null,
    epsNormalized: q.epsNormalized !== null ? q.epsNormalized * rate : null,
    revenue: q.revenue !== null ? q.revenue * rate : null,
    earnings: q.earnings !== null ? q.earnings * rate : null,
    ebitda: q.ebitda !== null ? q.ebitda * rate : null,
  }));
  return converted;
}

function convertPeriodToUsd(period: CompPeriodFinancials, rate: number): CompPeriodFinancials {
  const converted = { ...period };
  for (const field of USD_PERIOD_FIELDS) {
    const value = converted[field];
    if (typeof value === "number") {
      (converted[field] as number) = value * rate;
    }
  }
  return converted;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const [quote, details, periods] = await Promise.all([
    getQuote(symbol),
    getQuoteSummaryDetails(symbol).catch(() => null),
    getPeriodicFinancials(symbol).catch(() => []),
  ]);
  if (!quote) {
    return NextResponse.json({ error: "Symbol not found" }, { status: 404 });
  }

  const currency = quote.currency?.toUpperCase() ?? "USD";
  const rate = currency === "USD" ? 1 : await getFxRateToUsd(currency);

  const price = quote.regularMarketPrice !== null ? quote.regularMarketPrice * rate : null;
  const convertedDetails = details ? convertDetailsToUsd(details, rate) : null;
  const convertedPeriods = periods.map((p) => convertPeriodToUsd(p, rate));

  return NextResponse.json({
    symbol: quote.symbol,
    name: quote.longName ?? quote.shortName ?? quote.symbol,
    price,
    ...convertedDetails,
    periods: convertedPeriods,
  });
}
