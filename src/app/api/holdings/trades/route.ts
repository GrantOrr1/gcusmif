import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { SECTOR_INFO } from "@/lib/sectors";
import { addTrade, listAllTrades, listTradesForTicker, type TradeSide } from "@/lib/tradeLedger";

const VALID_SECTORS = new Set(SECTOR_INFO.map((s) => s.label));

/** Trade history is informational and shown on the public Portfolio pages, so reads need no auth. */
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  const trades = ticker ? listTradesForTicker(ticker.toUpperCase()) : listAllTrades();
  return NextResponse.json({ trades });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  if (!me || !hasPortfolioManagerAccess(me)) {
    return NextResponse.json({ error: "Only the Portfolio Manager can log trades" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : null;
  const sector = typeof body?.sector === "string" ? body.sector : "";
  const side: TradeSide | "" = body?.side === "buy" || body?.side === "sell" ? body.side : "";
  const quantity = typeof body?.quantity === "number" ? body.quantity : NaN;
  const price = typeof body?.price === "number" ? body.price : NaN;
  const tradedAt = typeof body?.tradedAt === "string" ? body.tradedAt : "";

  if (!ticker) return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  if (!VALID_SECTORS.has(sector)) return NextResponse.json({ error: "Invalid sector" }, { status: 400 });
  if (!side) return NextResponse.json({ error: "Side must be buy or sell" }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
  }
  if (!tradedAt || Number.isNaN(new Date(tradedAt).getTime())) {
    return NextResponse.json({ error: "A valid trade date/time is required" }, { status: 400 });
  }

  const trade = addTrade({
    ticker,
    companyName,
    sector,
    side,
    quantity,
    price,
    tradedAt: new Date(tradedAt).toISOString(),
    enteredBy: me.name,
  });

  return NextResponse.json({ trade });
}
