import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { listPendingForReviewer } from "@/lib/reportUploads";

export async function GET() {
  const session = await auth();
  const me = session ? TEAM.find((m) => isSamePerson(session.user?.name, m)) : undefined;
  if (!me) {
    return NextResponse.json({ count: 0 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = me.role.includes("Sector Head");
  if (!isPortfolioManager && !isSectorHead) {
    return NextResponse.json({ count: 0 });
  }

  const pending = listPendingForReviewer({
    isPortfolioManager,
    sector: me.sector ?? null,
  });
  return NextResponse.json({ count: pending.length });
}
