import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getPortfolioData } from "@/lib/portfolio";
import { sectorByCode } from "@/lib/sectors";
import { getCoverageForTicker, updateCoverageRating, RATINGS, type Rating } from "@/lib/coverageStore";
import { upsertPendingSubmission } from "@/lib/ratingSubmissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "No matching team profile" }, { status: 403 });
  }

  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.trim().toUpperCase();

  const portfolio = await getPortfolioData();
  const holding = portfolio.holdings.find((h) => h.ticker === ticker);
  if (!holding) {
    return NextResponse.json({ error: "Not a current fund holding" }, { status: 400 });
  }
  const sectorLabel = holding.sector ? (sectorByCode(holding.sector)?.label ?? holding.sector) : "Unassigned";

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = me.role.includes("Sector Head");
  const autoApprove = isPortfolioManager || (isSectorHead && sectorLabel === me.sector);
  const existing = getCoverageForTicker(ticker);

  const body = await req.json().catch(() => null);

  let rating: Rating | null = existing?.rating ?? null;
  if (body && "rating" in body) {
    if (body.rating === null) {
      rating = null;
    } else if (typeof body.rating === "string" && RATINGS.includes(body.rating as Rating)) {
      rating = body.rating as Rating;
    } else {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }
  }

  let targetPrice = existing?.targetPrice ?? null;
  if (body && "targetPrice" in body) {
    targetPrice =
      typeof body.targetPrice === "number" && Number.isFinite(body.targetPrice)
        ? body.targetPrice
        : null;
  }

  let triggerPrice = existing?.triggerPrice ?? null;
  if (body && "triggerPrice" in body) {
    triggerPrice =
      typeof body.triggerPrice === "number" && Number.isFinite(body.triggerPrice)
        ? body.triggerPrice
        : null;
  }

  if (autoApprove) {
    const item = updateCoverageRating({
      ticker,
      sector: sectorLabel,
      rating,
      targetPrice,
      triggerPrice,
      updatedBy: me.name,
    });
    return NextResponse.json({ status: "approved", item });
  }

  const submission = upsertPendingSubmission({
    targetType: "coverage",
    targetId: ticker,
    ticker,
    sector: sectorLabel,
    rating,
    targetPrice,
    triggerPrice,
    submittedBy: me.name,
  });
  return NextResponse.json({ status: "pending", submission });
}
