import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { listPendingForReviewer } from "@/lib/ratingSubmissions";

export async function GET() {
  const session = await auth();
  const me = TEAM.find((m) => isSamePerson(session?.user?.name, m));
  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = !!me?.role.includes("Sector Head");

  if (!me || (!isPortfolioManager && !isSectorHead)) {
    return NextResponse.json({ watchlist: 0, coverage: 0 });
  }

  const sector = me.sector ?? null;
  const watchlist = listPendingForReviewer({ targetType: "watchlist", isPortfolioManager, sector }).length;
  const coverage = listPendingForReviewer({ targetType: "coverage", isPortfolioManager, sector }).length;

  return NextResponse.json({ watchlist, coverage });
}
