import { NextRequest, NextResponse } from "next/server";
import { getTickerPerformance, RANGE_KEYS, type RangeKey } from "@/lib/performance";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker")?.trim().toUpperCase();
  const rangeParam = req.nextUrl.searchParams.get("range") ?? "ytd";

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }
  if (!RANGE_KEYS.includes(rangeParam as RangeKey)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const data = await getTickerPerformance(ticker, rangeParam as RangeKey);
  return NextResponse.json(data);
}
