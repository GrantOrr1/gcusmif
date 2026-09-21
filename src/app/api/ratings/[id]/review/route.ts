import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getSubmission, reviewSubmission } from "@/lib/ratingSubmissions";
import { updateWatchlistRating } from "@/lib/watchlistStore";
import { updateCoverageRating } from "@/lib/coverageStore";

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

  const { id: idParam } = await params;
  const id = Number(idParam);
  const submission = Number.isFinite(id) ? getSubmission(id) : undefined;
  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHeadOfSector = me.role.includes("Sector Head") && me.sector === submission.sector;
  if (!isPortfolioManager && !isSectorHeadOfSector) {
    return NextResponse.json(
      { error: "Only the Sector Head of this sector or the Portfolio Manager can review this rating" },
      { status: 403 }
    );
  }

  if (submission.status !== "pending") {
    return NextResponse.json({ error: "This rating has already been reviewed" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'approve' or 'decline'" }, { status: 400 });
  }

  if (action === "approve") {
    if (submission.targetType === "watchlist") {
      updateWatchlistRating(Number(submission.targetId), {
        rating: submission.rating,
        targetPrice: submission.targetPrice,
        triggerPrice: submission.triggerPrice,
      });
    } else {
      updateCoverageRating({
        ticker: submission.targetId,
        sector: submission.sector,
        rating: submission.rating,
        targetPrice: submission.targetPrice,
        triggerPrice: submission.triggerPrice,
        updatedBy: me.name,
      });
    }
  }

  const updated = reviewSubmission(id, action === "approve" ? "approved" : "declined", me.name);
  return NextResponse.json(updated);
}
