import { NextRequest, NextResponse } from "next/server";
import { RANGE_KEYS, type RangeKey } from "@/lib/performance";
import { getLedgerPortfolioPerformance } from "@/lib/ledgerPerformance";

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get("range") ?? "ytd";
  if (!RANGE_KEYS.includes(rangeParam as RangeKey)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const data = await getLedgerPortfolioPerformance(rangeParam as RangeKey);
  return NextResponse.json(data);
}
