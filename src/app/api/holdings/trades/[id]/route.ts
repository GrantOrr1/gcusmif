import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { deleteTrade } from "@/lib/tradeLedger";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  if (!me || !hasPortfolioManagerAccess(me)) {
    return NextResponse.json({ error: "Only the Portfolio Manager can remove trades" }, { status: 403 });
  }

  const { id } = await params;
  const tradeId = Number(id);
  if (!Number.isInteger(tradeId)) {
    return NextResponse.json({ error: "Invalid trade id" }, { status: 400 });
  }

  deleteTrade(tradeId);
  return NextResponse.json({ ok: true });
}
