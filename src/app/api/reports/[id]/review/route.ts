import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TEAM } from "@/data/team";
import { isSamePerson, hasPortfolioManagerAccess } from "@/lib/team";
import { getReportUpload, updateReportStatus } from "@/lib/reportUploads";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  const report = Number.isFinite(id) ? getReportUpload(id) : undefined;
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const isPortfolioManager = hasPortfolioManagerAccess(me);
  const isSectorHeadOfSector = me.role.includes("Sector Head") && me.sector === report.sector;
  if (!isPortfolioManager && !isSectorHeadOfSector) {
    return NextResponse.json(
      { error: "Only the Sector Head of this sector or the Portfolio Manager can review this upload" },
      { status: 403 }
    );
  }

  if (report.status !== "pending") {
    return NextResponse.json({ error: "This upload has already been reviewed" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'approve' or 'decline'" }, { status: 400 });
  }

  const updated = updateReportStatus(id, action === "approve" ? "approved" : "declined", me.name);
  return NextResponse.json(updated);
}
