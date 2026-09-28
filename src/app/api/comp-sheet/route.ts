import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuote, getQuoteSummaryDetails, getPeriodicFinancials } from "@/lib/yahoo";

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

  return NextResponse.json({
    symbol: quote.symbol,
    name: quote.longName ?? quote.shortName ?? quote.symbol,
    price: quote.regularMarketPrice,
    ...details,
    periods,
  });
}
