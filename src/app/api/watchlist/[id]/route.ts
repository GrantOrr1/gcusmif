import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getWatchlistItem, updateWatchlistRating } from "@/lib/watchlistStore";
import { upsertPendingSubmission } from "@/lib/ratingSubmissions";
import { RATINGS, type Rating } from "@/lib/ratings";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = TEAM.find((m) => isSamePerson(session.user?.name, m));
  if (!me) {
    return NextResponse.json({ error: "No matching team profile" }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  const item = getWatchlistItem(id);
  if (!item) {
    return NextResponse.json({ error: "Watchlist item not found" }, { status: 404 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHead = me.role.includes("Sector Head");
  const autoApprove = isPortfolioManager || (isSectorHead && item.sector === me.sector);

  const body = await req.json().catch(() => null);

  let rating: Rating | null = item.rating;
  if (body && "rating" in body) {
    if (body.rating === null) {
      rating = null;
    } else if (typeof body.rating === "string" && RATINGS.includes(body.rating as Rating)) {
      rating = body.rating as Rating;
    } else {
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
    }
  }

  let targetPrice = item.targetPrice;
  if (body && "targetPrice" in body) {
    targetPrice =
      typeof body.targetPrice === "number" && Number.isFinite(body.targetPrice)
        ? body.targetPrice
        : null;
  }

  let triggerPrice = item.triggerPrice;
  if (body && "triggerPrice" in body) {
    triggerPrice =
      typeof body.triggerPrice === "number" && Number.isFinite(body.triggerPrice)
        ? body.triggerPrice
        : null;
  }

  if (autoApprove) {
    const updated = updateWatchlistRating(id, { rating, targetPrice, triggerPrice });
    return NextResponse.json({ status: "approved", item: updated });
  }

  const submission = upsertPendingSubmission({
    targetType: "watchlist",
    targetId: String(id),
    ticker: item.ticker,
    sector: item.sector,
    rating,
    targetPrice,
    triggerPrice,
    submittedBy: me.name,
  });
  return NextResponse.json({ status: "pending", submission });
}
