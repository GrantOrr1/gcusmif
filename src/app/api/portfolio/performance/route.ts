import { NextRequest, NextResponse } from "next/server";
import { getPortfolioPerformance, RANGE_KEYS, type RangeKey } from "@/lib/performance";

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get("range") ?? "ytd";
  if (!RANGE_KEYS.includes(rangeParam as RangeKey)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const data = await getPortfolioPerformance(rangeParam as RangeKey);
  return NextResponse.json(data);
}
